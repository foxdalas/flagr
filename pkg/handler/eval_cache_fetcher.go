package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/foxdalas/flagr/pkg/config"
	"github.com/foxdalas/flagr/pkg/entity"
	"github.com/foxdalas/flagr/pkg/util"
	"github.com/foxdalas/flagr/swagger_gen/restapi/operations/export"
	"gorm.io/gorm"
)

// EvalCacheJSON is the JSON serialization format of EvalCache's flags
type EvalCacheJSON struct {
	Flags []entity.Flag
}

func (ec *EvalCache) export(query export.GetExportEvalCacheJSONParams) EvalCacheJSON {
	var targetIDs map[uint]struct{}
	if len(query.Ids) > 0 {
		targetIDs = make(map[uint]struct{}, len(query.Ids))
		for _, id := range query.Ids {
			targetIDs[uint(id)] = struct{}{}
		}
	}

	var targetKeys map[string]struct{}
	if len(query.Keys) > 0 {
		targetKeys = make(map[string]struct{}, len(query.Keys))
		for _, key := range query.Keys {
			targetKeys[key] = struct{}{}
		}
	}

	ec.cacheMutex.RLock()
	defer ec.cacheMutex.RUnlock()

	idCache := ec.cache.idCache

	// IDs have highest priority — direct O(k) lookup
	if targetIDs != nil {
		fs := make([]entity.Flag, 0, len(targetIDs))
		for id := range targetIDs {
			if f, ok := idCache[util.SafeString(id)]; ok {
				fs = append(fs, *f)
			}
		}
		return EvalCacheJSON{Flags: fs}
	}

	// Keys have second priority — direct O(k) lookup
	if targetKeys != nil {
		keyCache := ec.cache.keyCache
		fs := make([]entity.Flag, 0, len(targetKeys))
		for key := range targetKeys {
			if f, ok := keyCache[key]; ok {
				fs = append(fs, *f)
			}
		}
		return EvalCacheJSON{Flags: fs}
	}

	// Tags — use tagCache for direct lookup instead of O(n) scan
	if len(query.Tags) > 0 {
		tagCache := ec.cache.tagCache
		candidates := make(map[uint]*entity.Flag)

		if query.All != nil && *query.All {
			// ALL semantics: intersection of tag sets
			for i, tag := range query.Tags {
				fSet, ok := tagCache[tag]
				if !ok {
					return EvalCacheJSON{Flags: []entity.Flag{}}
				}
				if i == 0 {
					for fID, f := range fSet {
						candidates[fID] = f
					}
				} else {
					for fID := range candidates {
						if _, ok := fSet[fID]; !ok {
							delete(candidates, fID)
						}
					}
					if len(candidates) == 0 {
						return EvalCacheJSON{Flags: []entity.Flag{}}
					}
				}
			}
		} else {
			// ANY semantics: union of tag sets
			for _, tag := range query.Tags {
				if fSet, ok := tagCache[tag]; ok {
					for fID, f := range fSet {
						candidates[fID] = f
					}
				}
			}
		}

		// Apply enabled filter on candidates
		fs := make([]entity.Flag, 0, len(candidates))
		for _, f := range candidates {
			if query.Enabled != nil && *query.Enabled != f.Enabled {
				continue
			}
			fs = append(fs, *f)
		}
		return EvalCacheJSON{Flags: fs}
	}

	// Enabled-only or no filters — O(n) scan
	fs := make([]entity.Flag, 0, len(idCache))
	for _, f := range idCache {
		if query.Enabled != nil && *query.Enabled != f.Enabled {
			continue
		}
		fs = append(fs, *f)
	}
	return EvalCacheJSON{Flags: fs}
}

func (ec *EvalCache) fetchAllFlags() (idCache map[string]*entity.Flag, keyCache map[string]*entity.Flag, tagCache map[string]map[uint]*entity.Flag, err error) {
	fs, err := fetchAllFlags()
	if err != nil {
		return nil, nil, nil, err
	}

	idCache = make(map[string]*entity.Flag)
	keyCache = make(map[string]*entity.Flag)
	tagCache = make(map[string]map[uint]*entity.Flag)

	for i := range fs {
		f := &fs[i]
		if err := f.PrepareEvaluation(); err != nil {
			return nil, nil, nil, err
		}

		if f.ID != 0 {
			idCache[util.SafeString(f.ID)] = f
		}
		if f.Key != "" {
			keyCache[f.Key] = f
		}
		if f.Tags != nil {
			for _, s := range f.Tags {
				if tagCache[s.Value] == nil {
					tagCache[s.Value] = make(map[uint]*entity.Flag)
				}
				tagCache[s.Value][f.ID] = f
			}
		}
	}
	return idCache, keyCache, tagCache, nil
}

type evalCacheFetcher interface {
	fetch() ([]entity.Flag, error)
}

func newFetcher() (evalCacheFetcher, error) {
	if !config.Config.EvalOnlyMode {
		return &dbFetcher{db: getDB()}, nil
	}

	switch config.Config.DBDriver {
	case "json_file":
		return &jsonFileFetcher{filePath: config.Config.DBConnectionStr}, nil
	case "json_http":
		return &jsonHTTPFetcher{url: config.Config.DBConnectionStr}, nil
	default:
		return nil, fmt.Errorf(
			"failed to create evaluation cache fetcher. DBDriver:%s is not supported",
			config.Config.DBDriver,
		)
	}
}

var fetchAllFlags = func() ([]entity.Flag, error) {
	fetcher, err := newFetcher()
	if err != nil {
		return nil, err
	}
	return fetcher.fetch()
}

type jsonFileFetcher struct {
	filePath string
}

func (ff *jsonFileFetcher) fetch() ([]entity.Flag, error) {
	b, err := os.ReadFile(ff.filePath)
	if err != nil {
		return nil, err
	}
	ecj := &EvalCacheJSON{}
	err = json.Unmarshal(b, ecj)
	if err != nil {
		return nil, err
	}
	return ecj.Flags, nil
}

type jsonHTTPFetcher struct {
	url string
}

func (hf *jsonHTTPFetcher) fetch() ([]entity.Flag, error) {
	client := http.Client{Timeout: config.Config.EvalCacheRefreshTimeout}
	res, err := client.Get(hf.url)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	b, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	ecj := &EvalCacheJSON{}
	err = json.Unmarshal(b, ecj)
	if err != nil {
		return nil, err
	}
	return ecj.Flags, nil
}

type dbFetcher struct {
	db *gorm.DB
}

func (df *dbFetcher) fetch() ([]entity.Flag, error) {
	// Use eager loading to avoid N+1 problem
	// doc: http://jinzhu.me/gorm/crud.html#preloading-eager-loading
	fs := []entity.Flag{}
	err := entity.PreloadSegmentsVariantsTags(df.db).Find(&fs).Error
	return fs, err
}
