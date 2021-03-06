import { Sdk } from './Sdk';
import { BigNumber } from 'bignumber.js';

// Selectors
const tokenBalancesSelector = '#token-balances';
const allowanceToggleSelector = '.allowance-toggle';
const tableFixedSelector = '.table-fixed';
const wrapModalSelector = '#wrapModal';
const wrapEthAmountSelector = '#wrap-amount';
const wrapEthButtonSelector = '#wrap-eth-button';
const unwrapModalSelector = '#unwrapModal';
const unwrapEthAmountSelector = '#unwrap-amount';
const unwrapEthButtonSelector = '#unwrap-eth-button';
const spinnerSelector = '.spinner';
const baseTokenAmountSelector = '.base-token-amount';
const loaderSelector = '.loader';

const ETHBalance = '.ETH-Balance';
const WETHBalance = '.WETH-Balance';
const weth = '#WETH';

// Wrap button clicked
$(wrapEthButtonSelector).click(wrapEthAsync);
$(unwrapEthButtonSelector).click(unwrapEthAsync);

/**
 * Wrap the amount
 * @param e The toggle clicked event
 */
export async function wrapEthAsync() {
  try {
    const wrapAmount = $(wrapEthAmountSelector).val() as string;
    if (!wrapAmount || wrapAmount === '0') {
      alert('Please enter a valid number');
      return;
    }

    $(loaderSelector).css('opacity', '0.6').show();
    $(spinnerSelector).show();

    await Sdk.Instance.account.wrapEthAsync(new BigNumber(wrapAmount), { awaitTransactionMined: true });
    await updateTokensAndTableAsync();
    $(wrapModalSelector).modal('hide');
    $(spinnerSelector).hide();
    $(loaderSelector).hide();
  } catch (err) {
    alert(err.message);
    $(spinnerSelector).hide();
    $(loaderSelector).hide();
  }
}

export async function unwrapEthAsync() {
  try {
    const unwrapAmount = $(unwrapEthAmountSelector).val() as string;
    if (!unwrapAmount || unwrapAmount === '0') {
      alert('Please enter a valid number');
      return;
    }

    $(loaderSelector).css('opacity', '0.6').show();
    $(spinnerSelector).show();

    await Sdk.Instance.account.unwrapEthAsync(new BigNumber(unwrapAmount), { awaitTransactionMined: true });
    await updateTokensAndTableAsync();
    $(unwrapModalSelector).modal('hide');
    $(spinnerSelector).hide();
    $(loaderSelector).hide();
  } catch (err) {
    alert(err.message);
    $(spinnerSelector).hide();
    $(loaderSelector).hide();
  }
}

/**
 * Toggle a tokens allowance and update the UI
 * @param e The toggle clicked event
 */
export async function toggleAllowanceAsync(e: JQuery.Event<HTMLInputElement>) {
  // Prevent initial toggle
  e.preventDefault();

  try {
    const { name, id, checked } = e.currentTarget;

    $(loaderSelector).css('opacity', '0.6').show();
    $(spinnerSelector).show();

    if (checked) {
      await Sdk.Instance.account.setUnlimitedTokenAllowanceAsync(name, { awaitTransactionMined: true });
    } else {
      await Sdk.Instance.account.setTokenAllowanceAsync(name, new BigNumber(0), { awaitTransactionMined: true });
    }
    $(`#${id}`).prop('checked', checked).closest('div').attr('data-original-title', checked ? 'Disable Token' : 'Enable Token');
    $(spinnerSelector).hide();
    $(loaderSelector).hide();
  } catch (err) {
    console.log(err);
    $(spinnerSelector).hide();
    $(loaderSelector).hide();
  }
}

/**
 * Fetch all token balances and allowances
 * for this wallets default address
 */
export async function getAllTokenBalancesAndAllowancesAsync() {
  const tokenData = {};
  const total = Sdk.Instance.tokens.size;

  // Get ETH balance
  const ethBalance = await Sdk.Instance.account.getEthBalanceAsync();
  tokenData['ETH'] = {
    balance: ethBalance.toNumber()
  };

  // Get all token balances
  return new Promise(async resolve => {
    let current = 0;
    Sdk.Instance.tokens.forEach(async token => {
      const balance = await Sdk.Instance.account.getTokenBalanceAsync(token.address);
      if (balance.greaterThan(0)) {
        // Token has balance. Check the allowance
        const allowance = await Sdk.Instance.account.getTokenAllowanceAsync(token.address);
        tokenData[token.symbol] = {
          address: token.address,
          balance: balance.toNumber(),
          allowance: allowance.greaterThan(balance) ? true : false
        }
      }
      current += 1;
      if (current >= total) {
        resolve(tokenData);
      }
    });
  });
}


/**
 * Fetch token balances and allowances and
 * update the html table
 */
export async function updateTokensAndTableAsync() {
  const tokenData = await getAllTokenBalancesAndAllowancesAsync();
  //console.log(tokenData);
  createTokensTable(tokenData);
}


/**
 * Create the tokens html table
 *
 * @param tokenBalances The token balances
 */
function createTokensTable(tokenData: {}) {
  const table = document.createElement('table');
  const tHead = table.createTHead();
  const tr = tHead.insertRow();
  const tBody = table.createTBody();
  const columnNames = ['Token', 'Balance', 'Action'];

  table.classList.add('table');
  columnNames.forEach(name => {
    if (name === 'Token') {
    $(document.createElement('th')).html(name).appendTo(tr);
    } else {
    $(document.createElement('th')).attr('class', 'col').html(name).appendTo(tr);
    }
  });

  ///have or not have WETH
  if(!('WETH' in tokenData)){
    $(WETHBalance).text('0.0000000');
    $(weth).prop('disabled', true).css('cursor', 'default');
    $(baseTokenAmountSelector).prop('readonly', true);
  } else {
    $(weth).prop('disabled', false).css('cursor', 'pointer');
    $(baseTokenAmountSelector).prop('readonly', false);
  };

  // Enable tooltips on page
  $(function () {
    $('[data-toggle="tooltip"]').tooltip();
  })

  // Populate table
  Object.keys(tokenData).forEach(key => {
    if (key === 'ETH') {
      $(ETHBalance).html(tokenData[key].balance.toFixed(7));
    } else if (key === 'WETH') {
      $(WETHBalance).html(tokenData[key].balance.toFixed(7));
    };
    if (key !== 'ETH') {
      const tr = tBody.insertRow();
      $(tr.insertCell()).attr('align', 'middle').html(key); // Token Name
      $(tr.insertCell()).attr('align', 'middle').html(tokenData[key].balance.toFixed(7)); // Token Balance
      $(tr.insertCell()).html(`
        <div class="custom-control custom-toggle" data-toggle="tooltip" data-placement="left"
          title="${tokenData[key].allowance ? 'Disable' : 'Enable'} Token">
          <input type="checkbox" id="${key.toLowerCase()}-toggle" class="custom-control-input allowance-toggle"
            name="${tokenData[key].address}" ${tokenData[key].allowance ? 'checked' : ''}>
          <label class="custom-control-label" for="${key.toLowerCase()}-toggle"></label>
        </div>
    `);
    }
  });

  // Insert table
  $(tokenBalancesSelector).html('').append(table);

  // Add click event
  $(allowanceToggleSelector).click(toggleAllowanceAsync);

  // Adjust width
  // for (let i = 0; i < tr.cells.length; i++) {
  //   const thWidth = $(tableFixedSelector).find('th:eq(' + i + ')').width();
  //   const tdWidth = $(tableFixedSelector).find('td:eq(' + i + ')').width();
  //   if (thWidth < tdWidth) {
  //     $(tableFixedSelector).find('th:eq(' + i + ')').width(tdWidth);
  //   } else {
  //     $(tableFixedSelector).find('td:eq(' + i + ')').width(thWidth);
  //   }
  // }
}
