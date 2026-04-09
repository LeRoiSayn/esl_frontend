/**
 * useLevels — fetches academic levels from /api/academic-levels once per
 * browser session and caches the result module-level so every component
 * that calls this hook shares the same data without extra network requests.
 *
 * Returns:
 *   levels     — full array of { id, code, label, order, is_active }
 *   levelCodes — string[] of active codes in display order  (e.g. ['L1','L2','L3','M1','M2'])
 *   levelOrder — { L1: 1, L2: 2, … }  for sorting
 *   loading    — boolean
 */
import { useState, useEffect } from 'react'
import { academicLevelApi } from '../services/api'

let _cache        = null   // module-level cache
let _fetchPromise = null   // single in-flight promise

export function useLevels({ activeOnly = true } = {}) {
  const [levels, setLevels] = useState(_cache || [])
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    if (_cache) {
      setLevels(_cache)
      setLoading(false)
      return
    }

    // Start the fetch only once even if multiple components mount simultaneously
    if (!_fetchPromise) {
      _fetchPromise = academicLevelApi.getAll()
        .then(res => {
          _cache = (res.data.data || []).sort((a, b) => a.order - b.order)
          return _cache
        })
        .catch(() => {
          _cache = []
          _fetchPromise = null  // allow retry on next mount
          return []
        })
    }

    _fetchPromise.then(data => {
      setLevels(data)
      setLoading(false)
    })
  }, [])

  const filtered   = activeOnly ? levels.filter(l => l.is_active) : levels
  const levelCodes = filtered.map(l => l.code)
  const levelOrder = Object.fromEntries(filtered.map(l => [l.code, l.order]))

  return { levels: filtered, levelCodes, levelOrder, loading }
}

/**
 * Invalidate the module-level cache (call after creating/editing a level).
 */
export function invalidateLevelsCache() {
  _cache        = null
  _fetchPromise = null
}
