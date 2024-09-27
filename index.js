import axios from "axios"
import delay from "delay"
import fs from "fs"
// Function to fetch historical price data for a given cryptocurrency from CoinGecko
async function fetchHistoricalData(cryptoSymbol, startDate, endDate) {
  const url = `https://api.coingecko.com/api/v3/coins/${cryptoSymbol}/market_chart/range?vs_currency=usd&from=${startDate}&to=${endDate}&precision=3`
  try {
    const response = await axios.get(url)
    return response.data.prices.map((priceData) => priceData[1])
  } catch (error) {
    console.error("Error fetching historical data:", error)
    return null
  }
}

// Function to calculate mean of an array
function mean(arr) {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length
}

// Function to calculate cross-correlation between two time series
function calculateCrossCorrelation(series1, series2) {
  if (series1.length !== series2.length) {
    throw new Error("Series lengths must be equal")
  }

  const mean1 = mean(series1)
  const mean2 = mean(series2)

  let numerator = 0
  let denom1 = 0
  let denom2 = 0

  for (let i = 0; i < series1.length; i++) {
    const diff1 = series1[i] - mean1
    const diff2 = series2[i] - mean2
    numerator += diff1 * diff2
    denom1 += diff1 ** 2
    denom2 += diff2 ** 2
  }

  if (denom1 === 0 || denom2 === 0) {
    return 0
  }

  return numerator / Math.sqrt(denom1 * denom2)
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
    return cryptocurrencies
  } catch (error) {
    console.error("Error fetching cryptocurrencies:", error)
    return []
  }
}

// Main function to orchestrate the trading strategy
async function main() {
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime() // Replace with desired start date
  const endDate = new Date().getTime() // Replace with desired end date
  console.log(`the endDate is: ${endDate} and the startDate is: ${startDate}`)
  const cryptocurrencies = await getCryptocurrencies()
  console.log(cryptocurrencies)

  // Fetch historical price data for each cryptocurrency
  const historicalData = await Promise.all(
    cryptocurrencies.map(async (symbol, index) => {
      await delay(index * 25000) // add a 10 second delay between requests
      const data = await fetchHistoricalData(symbol, startDate, endDate)
      console.log(`Data fetched successfully for: ${symbol}`)
      return data
    })
  )

  // writing the history data to a file bellow
  fs.writeFile("data.json", JSON.stringify(historicalData), (err) => {
    if (err) console.log(err)
    else console.log("data.json written successfully")
  })

  // Calculate cross-correlation matrix for all pairs of cryptocurrencies
  const crossCorrelationMatrix = []
  for (let i = 0; i < cryptocurrencies.length; i++) {
    for (let j = i + 1; j < cryptocurrencies.length; j++) {
      try {
        const correlation = calculateCrossCorrelation(
          historicalData[i],
          historicalData[j]
        )
        crossCorrelationMatrix.push({
          pair: `${cryptocurrencies[i]}:${cryptocurrencies[j]}`,
          correlation,
        })
      } catch (error) {
        console.error(`Error calculating correlation for ${i} and ${j}`, error)
      }
    }
  }

  // Sort pairs based on cross-correlation
  crossCorrelationMatrix.sort(
    (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)
  )

  // Select the top 46 pairs with the least absolute correlation
  const selectedPairs = crossCorrelationMatrix.slice(0, 46)

  console.log("Top 46 pairs with the best absolute correlation:")
  selectedPairs.forEach((pair) => console.log(pair.pair, pair.correlation))
  console.log("/n all pairs with correlation:")
  crossCorrelationMatrix.forEach((pair) =>
    console.log(pair.pair, pair.correlation)
  )
}

// Execute the main function
main()
