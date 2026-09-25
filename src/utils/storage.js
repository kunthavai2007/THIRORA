export function readStorage(key, fallback, isValid = () => true) {
  try {
    const storedValue = localStorage.getItem(key)

    if (storedValue === null) {
      return fallback
    }

    const parsedValue = JSON.parse(storedValue)
    return isValid(parsedValue) ? parsedValue : fallback
  } catch {
    return fallback
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    return
  }
}

export function removeStorage(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    return
  }
}

export function notifyDataChange(action = 'updated') {
  try {
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new CustomEvent('careerflow:data-update', { detail: { action } }))
  } catch {
    // ignore
  }
}
