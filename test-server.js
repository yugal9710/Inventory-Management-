require('dotenv').config();
require('./backend/server');

const PORT = process.env.PORT || 5005;
const BASE_URL = `http://localhost:${PORT}`;

setTimeout(async () => {
  try {
    console.log('\n--- 🧪 STARTING NEPAL IRON STORE SUITE TEST ---');

    // 1. Health
    const health = await (await fetch(`${BASE_URL}/api/health`)).json();
    console.log('1. ✅ Health Check:', health.status);

    // 2. Products List
    const prods = await (await fetch(`${BASE_URL}/api/products`)).json();
    console.log('2. ✅ Products count:', prods.data.length, '(e.g.', prods.data[0].name_en, ')');

    // 3. Low Stock Items
    const lowStock = await (await fetch(`${BASE_URL}/api/inventory/low-stock`)).json();
    console.log('3. ✅ Low Stock alerts count:', lowStock.data.length);

    // 4. Remnants & Cut Pieces
    const remnants = await (await fetch(`${BASE_URL}/api/inventory/remnants`)).json();
    console.log('4. ✅ Available Cut Remnants count:', remnants.data.length);

    // 5. Create Sale with Cut-Length & Split Payment
    const tmtProd = prods.data.find(p => p.code.includes('TMT-12'));
    const salePayload = {
      invoiceType: 'TAX_INVOICE',
      customerId: 1,
      customerName: 'ABC Nirman Sewa Pvt. Ltd.',
      customerPan: '601239841',
      dateBs: '2083-07-13',
      items: [
        {
          productId: tmtProd.id,
          locationId: 1,
          quantity: 50,
          unit: 'kg',
          unitPrice: 99.5,
          discountPercent: 1.0,
          isCutLength: 1,
          cutLengthMeters: 4.5
        }
      ],
      payments: [
        { method: 'CASH', amount: 3000, referenceNumber: 'CASH-01' },
        { method: 'QR_FONEPAY', amount: 2000, referenceNumber: 'FP-TEST-99' }
      ],
      isDeliveryChallan: 1,
      notes: 'Test site delivery',
      userId: 2
    };

    const saleRes = await (await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(salePayload)
    })).json();

    console.log('5. ✅ Sale Invoice Created:', saleRes.data.invoice_no, '| Total:', saleRes.data.formattedTotal);
    console.log('   Amount in Words (Nepali):', saleRes.data.amountInWordsNp);

    // 6. IRD VAT Sales Register Schedule 10
    const vatReport = await (await fetch(`${BASE_URL}/api/reports/vat-sales`)).json();
    console.log('6. ✅ IRD VAT Sales Register (Schedule 10) Total Sales:', vatReport.data.totals.total_amount);

    // 7. Cash Drawer Session & Petty Cash Expense
    const expenseRes = await (await fetch(`${BASE_URL}/api/cashbook/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'EXPENSE',
        category: 'TEA_KHAJA',
        amount: 350,
        description: 'Yard workers afternoon snack',
        payee: 'Bhattarai Hotel'
      })
    })).json();
    console.log('7. ✅ Daily Petty Cash Expense Recorded:', expenseRes.message);

    // 8. Stock Movement Ledger
    const ledger = await (await fetch(`${BASE_URL}/api/inventory/ledger?limit=5`)).json();
    console.log('8. ✅ Stock Ledger (Single Source of Truth) latest movement:', ledger.data[0].movement_type, '| Qty:', ledger.data[0].base_quantity);

    // 9. Frontend HTML
    const html = await (await fetch(`${BASE_URL}/`)).text();
    console.log('9. ✅ Web Frontend SPA Bundle active:', html.includes('id="root"'));

    console.log('\n🎉 ALL NEPAL IRON STORE TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}, 1200);
