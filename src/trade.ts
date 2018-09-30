import { BigNumber } from 'bignumber.js';
import { UserOrderType, RadarBook, RadarSignedOrder } from '@radarrelay/types';
import { Sdk } from './Sdk';

let currentOrderBook: RadarBook;

// Selectors
const baseTokenSelectSelector = '#base-token-select';
const quoteTokenSelectSelector = '#quote-token-select';
const baseTokenAmountSelector = '#base-token-amount';
const quoteTokenAmountSelector = '#quote-token-amount';
const orderTypeSelector = '#order-type';
const exchangeButtonSelector = '#exchange-button';
const spinnerSelector = '.spinner';

const buy = '#BUY';
const sell = '#SELL';
const title1 = '#title1';
const title2 = '#title2';


// Tokens changed - Update book and amounts
$(`${baseTokenSelectSelector}, ${quoteTokenSelectSelector}`).change(async () => {
  await updateBookAsync();
  baseAmountChanged();
});

// Base amount changed
$(baseTokenAmountSelector).on('change keyup paste', baseAmountChanged);

// Exchange button clicked
$(exchangeButtonSelector).click(exchangeAsync);

$(buy).click(function(){
  $(title1).text('BUY');
  $(title2).text('SELL');
});

$(sell).click(function(){
  $(title1).text('SELL');
  $(title2).text('BUY');
});

// console.log(typeof $(title1).text());
// console.log(typeof $(orderTypeSelector).val())

/**
 * Populate the base and quote token dropdowns
 */
export function populateTokenDropdowns() {
  // Sdk.Instance.tokens.forEach(token => {
  //   if (token.quote) {
  //     $(quoteTokenSelectSelector).append($('<option />').val(token.symbol).text(`${token.symbol} - ${token.name}`));
  //   } else {
  //     $(baseTokenSelectSelector).append($('<option />').val(token.symbol).text(`${token.symbol} - ${token.name}`));
  //   }
  // });

  // Update book
  updateBookAsync();
}

/**
 * Update the book when the market changes
 */
export async function updateBookAsync() {
  // console.log(Sdk.Instance.markets);
  const market = await Sdk.Instance.markets.getAsync(`${$(baseTokenSelectSelector).val()}-${$(quoteTokenSelectSelector).val()}`);
  // console.log(market);
  currentOrderBook = await market.getBookAsync();
  console.log(currentOrderBook);
}

/**
 * Base amount has changed. Update the quote token amount
 */
export function baseAmountChanged() {
  console.log(1);
  let baseTokenAmount = new BigNumber($(baseTokenAmountSelector).val() as string);
  const orderType = UserOrderType[$(title1).text() as string];

  let quoteTokenAmount = new BigNumber(0);
  if (orderType === UserOrderType.BUY && currentOrderBook.asks.length) {
    quoteTokenAmount = calculateQuoteTokenAmount(baseTokenAmount, quoteTokenAmount, currentOrderBook.asks);
  }

  if (orderType === UserOrderType.SELL && currentOrderBook.bids.length) {
    quoteTokenAmount = calculateQuoteTokenAmount(baseTokenAmount, quoteTokenAmount, currentOrderBook.bids);
  }

  // Set quote token amount
  $(quoteTokenAmountSelector).val(quoteTokenAmount.toString())
}

/**
 * Calculate the quote token amount
 * @param baseTokenAmount The base token amount
 * @param quoteTokenAmount The quote token amount
 * @param orders The orders to iterate
 */
function calculateQuoteTokenAmount(baseTokenAmount: BigNumber, quoteTokenAmount: BigNumber, orders: RadarSignedOrder[]) {
  for (const order of orders) {
    if (baseTokenAmount.lessThanOrEqualTo(order.remainingBaseTokenAmount)) {
      quoteTokenAmount = quoteTokenAmount.plus(baseTokenAmount.times(order.price));
      break;
    } else {
      quoteTokenAmount = quoteTokenAmount.plus(new BigNumber(order.remainingBaseTokenAmount).times(order.price));
      baseTokenAmount = baseTokenAmount.minus(order.remainingBaseTokenAmount);
    }
  }
  return quoteTokenAmount;
}

/**
 * Execute the market order
 */
export async function exchangeAsync() {
  try {
    if (Sdk.Instance.markets) {
      const baseTokenAmount = $(baseTokenAmountSelector).val() as string;
      if (!baseTokenAmount || baseTokenAmount === '0') {
        alert('Please enter a base token amount');
        return;
      }

      $(spinnerSelector).show();

      const orderType = $(title1).text() as string;
      const market = await Sdk.Instance.markets.getAsync(`${$(baseTokenSelectSelector).val()}-${$(quoteTokenSelectSelector).val()}`);
      const txReceipt = await market.marketOrderAsync(UserOrderType[orderType], new BigNumber(baseTokenAmount), { awaitTransactionMined: true });

      $(spinnerSelector).hide();

      alert(`Transaction Sucessful: ${(txReceipt as any).transactionHash}`);
    }
  } catch (err) {
    alert(err.message);
    $(spinnerSelector).hide();
  }
}
