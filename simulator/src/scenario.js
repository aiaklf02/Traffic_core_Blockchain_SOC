// Example scenario: rush hour traffic
export const rushHourScenario = {
  name: 'Rush Hour',
  description: 'Simulates increased traffic and congestion between 7-9am and 5-7pm',
  isActive: (date = new Date()) => {
    const hour = date.getHours();
    return (hour >= 7 && hour < 9) || (hour >= 17 && hour < 19);
  },
  getTrafficMultiplier: (date = new Date()) => {
    return rushHourScenario.isActive(date) ? 2.5 : 1;
  },
};

// Example scenario: rainy weather
export const rainyScenario = {
  name: 'Rainy Weather',
  description: 'Simulates increased air quality readings and lower speeds during rain',
  isActive: (date = new Date()) => {
    // Simulate rain on random days
    return date.getDate() % 3 === 0;
  },
  getSpeedMultiplier: (date = new Date()) => {
    return rainyScenario.isActive(date) ? 0.7 : 1;
  },
};
