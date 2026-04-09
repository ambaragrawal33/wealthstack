import yahooFinance from 'yahoo-finance2';
async function test() {
  const res = await yahooFinance.search('microsoft');
  console.log(res.quotes[0]);
}
test();
