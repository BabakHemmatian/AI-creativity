export const getKey = (map, val) => {
  for (let [key, value] of map.entries()) {
    if (value === val) return key
  }
}

export const randSubAdd = (WAIT_TIME, WAIT_TIME_DIFF) => {
  const randNum = Math.floor(Math.random() * WAIT_TIME_DIFF * -5)
  return randNum - WAIT_TIME
}
