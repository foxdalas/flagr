import { ElMessage } from 'element-plus'

function indexBy (arr, prop) {
  return arr.reduce((acc, el) => {
    acc[el[prop]] = el
    return acc
  }, {})
}

function pluck (arr, prop) {
  return arr.map(el => el[prop])
}

function sum (arr) {
  return arr.reduce((acc, el) => {
    acc += el
    return acc
  }, 0)
}

function get (obj, path, def) {
  const fullPath = path
    .replace(/\[/g, '.')
    .replace(/]/g, '')
    .split('.')
    .filter(Boolean)

  return fullPath.every(everyFunc) ? obj : def

  function everyFunc (step) {
    return !(step && (obj = obj[step]) === undefined)
  }
}

function handleErr (err) {
  let msg = get(err, 'response.data.message', 'Request error')
  ElMessage({ message: msg, type: 'error', duration: 5000 })
  if (get(err, 'response.status') === 401) {
    try {
      let redirectURL = err.response.headers['www-authenticate'].split(`"`)[1]
      const url = new URL(redirectURL, window.location.origin)
      if (url.origin === window.location.origin) {
        window.location = url.href
      }
    } catch {
      // malformed URL — ignore redirect
    }
  }
}

// Render any ISO timestamp as UTC "YYYY-MM-DD HH:MM[:SS]". The API is inconsistent
// — the flag list carries a local offset ("...+02:00") while snapshots are already
// UTC ("...Z") — so we normalise through Date.toISOString(), which is always UTC.
// This gives a single, machine-independent clock for incident investigation, and
// makes the "(UTC)" column label truthful regardless of the source offset.
function formatDateUTC(isoString, withSeconds = false) {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ''
  const s = d.toISOString().replace('T', ' ')
  return withSeconds ? s.slice(0, 19) : s.slice(0, 16)
}

function timeAgo(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(months / 12)
  return `${years}y ago`
}

export default {
  indexBy,
  pluck,
  sum,
  get,
  handleErr,
  timeAgo,
  formatDateUTC
}
