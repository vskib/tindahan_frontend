import { pesos } from '../lib/money.js';
import { formatDateTime } from '../lib/format.js';

/** Receipt content comes ONLY from the server's confirmed sale record. */
export default function Receipt({ receipt, copy = false }) {
  return (
    <div className="receipt receipt-print" data-testid="receipt" aria-label="Sales receipt preview">
      <div className="receipt-preview-label text-center text-xs uppercase tracking-widest text-base-content/60">Receipt preview</div>
      <div className="text-center font-bold" style={{ fontSize: 16 }}>{receipt.store_name}</div>
      <div className="text-center font-semibold">Sales receipt{copy ? ' (copy)' : ''}</div>
      <div className="sep" />
      <div>No: {receipt.txn_no}</div>
      <div>Date: {formatDateTime(receipt.created_at)}</div>
      {receipt.cashier_name && <div>Cashier: {receipt.cashier_name}</div>}
      <div className="sep" />
      <table>
        <thead className="sr-only"><tr><th scope="col">Item and quantity</th><th scope="col">Line total</th></tr></thead>
        <tbody>
          {receipt.items.map((i) => (
            <tr key={i.product_id}>
              <td>
                <div>{i.product_name}</div>
                <div>&nbsp;&nbsp;{i.qty} × {pesos(i.unit_price_centavos)}</div>
              </td>
              <td className="money">{pesos(i.line_total_centavos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sep" />
      <div className="row-split font-bold"><span>TOTAL</span><span>{pesos(receipt.total_centavos)}</span></div>
      <div className="row-split"><span>Cash</span><span>{pesos(receipt.cash_received_centavos)}</span></div>
      <div className="row-split"><span>Change</span><span>{pesos(receipt.change_centavos)}</span></div>
      <div className="sep" />
      <div className="text-center">Salamat po!</div>
    </div>
  );
}
