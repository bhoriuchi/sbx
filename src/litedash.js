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

// function to determine if the object is a promise
export function isPromise (obj) {
  return obj && isFunction(obj.then)
}

export function contains (list, value) {
  for (let item of list) {
    if (item === value) return true
  }
  return false
}

export function circular (obj) {
  let circularEx = (obj, value = '[Circular]', key = null, seen = []) => {
    seen.push(obj)
    if (isObject(obj)) {
      forEach(obj, (o, i) => {
        if (contains(seen, o)) obj[i] = isFunction(value) ? value(obj, key, seen.slice(0)) : value
        else circularEx(o, value, i, seen.slice(0))
      })
    }
    return obj
  }

  if (!obj) throw new Error('circular requires an object to examine')
  return circularEx(obj)
}