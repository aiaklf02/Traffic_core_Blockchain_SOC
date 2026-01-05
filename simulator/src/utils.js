export function randomBetween(min, max, precision = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(precision));
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
