package handler

import (
	"fmt"

	"github.com/foxdalas/flagr/pkg/entity"
	"github.com/foxdalas/flagr/pkg/util"
)

// GenFixtureEvalCache generates a fixture
func GenFixtureEvalCache() *EvalCache {
	f := entity.GenFixtureFlag()

	tagCache := make(map[string]map[uint]*entity.Flag)
	for _, tag := range f.Tags {
		tagCache[tag.Value] = map[uint]*entity.Flag{f.ID: &f}
	}

	ec := &EvalCache{
		cache: &cacheContainer{
			idCache:  map[string]*entity.Flag{util.SafeString(f.ID): &f},
			keyCache: map[string]*entity.Flag{f.Key: &f},
			tagCache: tagCache,
		},
	}

	return ec
}

// GenFixtureEvalCacheWithNFlags generates an EvalCache with n realistic flags.
// Each flag has segments with constraints, multiple variants, and tags.
func GenFixtureEvalCacheWithNFlags(n int) *EvalCache {
	idCache := make(map[string]*entity.Flag, n)
	keyCache := make(map[string]*entity.Flag, n)
	tagCache := make(map[string]map[uint]*entity.Flag)

	for i := 0; i < n; i++ {
		f := entity.GenFixtureFlag()
		f.ID = uint(100 + i)
		f.Key = fmt.Sprintf("flag_key_%d", 100+i)
		f.Tags = []entity.Tag{
			{Value: "tag1"},
			{Value: "tag2"},
			{Value: fmt.Sprintf("cohort_%d", i%3)},
		}

		for vi := range f.Variants {
			f.Variants[vi].ID = uint(300 + i*10 + vi)
			f.Variants[vi].FlagID = f.ID
		}
		for si := range f.Segments {
			f.Segments[si].FlagID = f.ID
			for di := range f.Segments[si].Distributions {
				if di < len(f.Variants) {
					f.Segments[si].Distributions[di].VariantID = f.Variants[di].ID
					f.Segments[si].Distributions[di].VariantKey = f.Variants[di].Key
				}
			}
		}
		if err := f.PrepareEvaluation(); err != nil {
			panic(err)
		}

		idCache[util.SafeString(f.ID)] = &f
		keyCache[f.Key] = &f
		for _, tag := range f.Tags {
			if _, ok := tagCache[tag.Value]; !ok {
				tagCache[tag.Value] = map[uint]*entity.Flag{}
			}
			tagCache[tag.Value][f.ID] = &f
		}
	}

	return &EvalCache{
		cache: &cacheContainer{
			idCache:  idCache,
			keyCache: keyCache,
			tagCache: tagCache,
		},
	}
}
