import axios from "axios"
import delay from "delay"
import fs from "fs"

// Function to fetch historical price data for a given cryptocurrency from CoinGecko
async function fetchHistoricalData(cryptoSymbol, startDate, endDate) {
  const url = `https://api.coingecko.com/api/v3/coins/${cryptoSymbol}/market_chart/range?vs_currency=usd&from=${startDate}&to=${endDate}&precision=3`
  try {
    const response = await axios.get(url)
    const { prices = [] } = response.data || {}
    return prices.map((priceData) => priceData[1])
  } catch (error) {
    console.error("Error fetching historical data:", error)
    return []
  }
}

// Function to calculate mean of an array
function mean(arr) {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length || 0
}

// Function to calculate cross-correlation between two time series

/**
 * Calculate the cross-correlation between two time series.
 *
 * @param {Array} series1 - The first time series.
 * @param {Array} series2 - The second time series.
 * @return {number} The cross-correlation coefficient between the two series.
 */
function calculateCrossCorrelation(series1, series2) {
  // Check if the series have the same length and are not empty
  if (
    !series1?.length ||
    !series2?.length ||
    series1.length !== series2.length
  ) {
    return 0
  }

  // Calculate the means of the two series
  const mean1 = mean(series1)
  const mean2 = mean(series2)

  let numerator = 0
  let denom1 = 0
  let denom2 = 0

  // Calculate the numerator, denominator1 and denominator2
  for (let i = 0; i < series1.length; i++) {
    const diff1 = series1[i] - mean1
    const diff2 = series2[i] - mean2
    numerator += diff1 * diff2
    denom1 += diff1 ** 2
    denom2 += diff2 ** 2
  }

  // Check for division by zero and return the cross-correlation coefficient
  if (denom1 === 0 || denom2 === 0) {
    return 0
  }

  return numerator / Math.sqrt(denom1 * denom2)
}

// Function to select 46 uncorrelated assets

/**
 * Selects 46 uncorrelated assets from the given list of cryptocurrencies
 * using historical price data.
 *
 * @param {Array} cryptocurrencies - The list of cryptocurrencies to select from.
 * @param {Object} historicalData - The historical price data for each cryptocurrency.
 * @returns {Array} The selected 46 uncorrelated assets.
 */
function selectUncorrelatedAssets(cryptocurrencies, historicalData) {
  // Array to store the selected assets
  const selectedAssets = []
  // Create a copy of the cryptocurrencies array to avoid mutating the original
  const remainingCryptos = [...cryptocurrencies]

  // Loop until 5 assets are selected or no more cryptocurrencies remain
  while (selectedAssets.length < 5 && remainingCryptos.length > 0) {
    // Get the next cryptocurrency from the list
    const currentCrypto = remainingCryptos.shift()

    // Check if the current cryptocurrency is uncorrelated with the selected assets
    const isUncorrelated = selectedAssets.every((asset) => {
      // Calculate the cross-correlation between the current cryptocurrency and the asset
      const correlation = calculateCrossCorrelation(
        historicalData[currentCrypto],
        historicalData[asset]
      )
      // Return true if the correlation is below the threshold (0.2)
      return Math.abs(correlation) < 0.2
    })

    // If the current cryptocurrency is uncorrelated, add it to the selected assets
    if (isUncorrelated) {
      selectedAssets.push(currentCrypto)
    }
  }

  // Return the selected 46 uncorrelated assets
  return selectedAssets
}

async function getCryptocurrencies() {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/coins/markets",
      {
        params: {
          vs_currency: "usd",
          order: "volume_desc",
          per_page: 100,
          page: 1,
          sparkline: true,
          locale: "en",
          precision: 3,
        },
      }
    )
    const cryptocurrencies = response.data
      .filter(
        (coin) => coin.market_cap > 10000000 && coin.market_cap < 5000000000
      ) // Filter coins with mid cap
      .map((coin) => coin.id) // Get the ids of the filtered coins
    return cryptocurrencies || []
  } catch (error) {
    console.error("Error fetching cryptocurrencies:", error)
    return []
  }
}

// Main function to orchestrate the trading strategy
async function main() {
  const startDate = "1710277894" // Replace with desired start date
  const endDate = "1712858541" // Replace with desired end date
  const cryptocurrencies = await getCryptocurrencies()
  console.log(cryptocurrencies)

  // Fetch historical price data for each cryptocurrency
  const historicalData = await Promise.all(
    cryptocurrencies.map(async (symbol, index) => {
      await delay(index * 25000) // add a delay between requests
      const data = await fetchHistoricalData(symbol, startDate, endDate)
      console.log(`Data fetched successfully for: ${symbol}`)
      return data
    })
  )

  // writing the history data to a file below
  fs.writeFile("data.json", JSON.stringify(historicalData), (err) => {
    if (err) console.log(err)
    else console.log("data.json written successfully")
  })

  // Select 46 uncorrelated assets
  const selectedAssets = selectUncorrelatedAssets(
    cryptocurrencies,
    historicalData
  )

  console.log("46 uncorrelated cryptocurrencies:")
  console.log(selectedAssets)
}

// Execute the main function
main()
