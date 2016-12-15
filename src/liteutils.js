export function isFunction (obj) {
  return typeof obj === 'function'
}

export function isString (obj) {
  return typeof obj === 'string'
}

export function isArray (obj) {
  return Array.isArray(obj)
}

export function isDate (obj) {
  return obj instanceof Date
}

export function isObject (obj) {
  return typeof obj === 'object' && obj !== null
}

export function isBoolean (obj) {
  return typeof obj === 'boolean'
}

export function isNumber (obj) {
  return !isNaN(obj)
}

export function isHash (obj) {
  return isObject(obj) && !isArray(obj) && !isDate(obj) && obj !== null
}

export function forEach (obj, fn) {
  try {
    if (Array.isArray(obj)) {
      let idx = 0
      for (let val of obj) {
        if (fn(val, idx) === false) break
        idx++
      }
    } else {
      for (const key in obj) {
        if (fn(obj[key], key) === false) break
      }
    }
  } catch (err) {
    return
  }
}

export function isPromise (obj) {
  return isObject(obj) && isFunction(obj.then) && isFunction(obj.catch)
}

export function contains (list, obj) {
  return list.reduce((prev, cur) => (cur === obj && prev), false)
}

export function circular (obj, value = '[Circular]') {
  let circularEx = (_obj, key = null, seen = []) => {
    seen.push(_obj)
    if (isObject(_obj)) {
      forEach(_obj, (o, i) => {
        if (contains(seen, o)) _obj[i] = isFunction(value) ? value(_obj, key, seen.slice(0)) : value
        else circularEx(o, i, seen.slice(0))
      })
    }
    return _obj
  }

  if (!obj) throw new Error('circular requires an object to examine')
  return circularEx(obj, value)
}

export function union () {
  let args = [ ...arguments ]
  if (!args.length) return []

  try {
    let u = args.reduce((prev, cur) => {
      if (!isArray(prev) || !isArray(cur)) return []
      return prev.concat(cur)
    }, [])

    return [ ...new Set(u) ]
  } catch (err) {
    return []
  }
}
