import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useFetch } from '../lib/hooks.js';
import { addDays, formatDateTime, todayYmd } from '../lib/format.js';
import { pesos } from '../lib/money.js';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import Receipt from '../components/Receipt.jsx';
import { Empty, ErrorAlert, Loading } from '../components/Ui.jsx';

const weekStart = (ymd) => {
  const weekday = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return addDays(ymd, -((weekday + 6) % 7));
};

function SaleDetail({ id, onClose }) {
  const d = useFetch(() => api(`/api/sales/${id}`), [id]);
  const sale = d.data?.data;
  const receipt = sale ? { ...sale, cashier_name: sale.cashier?.full_name } : null;
  return (
    <Modal title="Sale details" onClose={onClose}
      footer={<><button className="btn btn-outline btn-secondary" onClick={() => window.print()} disabled={!receipt}>🖨 Print copy</button>
        <button className="btn btn-primary" onClick={onClose}>Close</button></>}>
      {d.loading && !receipt && <Loading variant="detail" />}
      <ErrorAlert error={d.error} onRetry={d.reload} />
      {receipt && <Receipt receipt={receipt} copy />}
    </Modal>
  );
}

export default function Sales() {
  const { isOwner } = useAuth();
  const today = todayYmd();
  const [from, setFrom] = useState(() => weekStart(today));
  const [to, setTo] = useState(today);
  const [period, setPeriod] = useState('week');
  const [reportRequested, setReportRequested] = useState(false);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const pageSize = 20;
  const rangeError = !from || !to ? 'Choose both dates.' : to < from ? 'The end date is before the start date.' : null;

  const list = useFetch(() => (rangeError ? Promise.resolve(null) : api(`/api/sales?from=${from}&to=${to}&page=${page}&pageSize=${pageSize}`)), [from, to, page, rangeError]);
  const days = useFetch(() => (!isOwner || rangeError ? Promise.resolve(null) : api(`/api/reports/daily-sales?from=${from}&to=${to}`)), [from, to, isOwner, rangeError]);
  const report = useFetch(() => (!reportRequested || rangeError ? Promise.resolve(null) : api(`/api/reports/period-sales?from=${from}&to=${to}&period=${period}`)), [from, to, period, rangeError, reportRequested]);

  const setRange = (a, b) => { setFrom(a); setTo(b); setPage(1); };
  const setCurrentWeek = () => setRange(weekStart(today), today);
  const setCurrentMonth = () => setRange(`${today.slice(0, 7)}-01`, today);
  const generateReport = () => {
    if (reportRequested) report.reload();
    else setReportRequested(true);
  };
  const rows = list.data?.data ?? [];
  const dayRows = days.data?.data ?? [];
  const reportRows = report.data?.data ?? [];
  const inventory = report.data?.inventory ?? null;
  const downloadReport = () => {
    const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const csvRows = [
      ['Section', 'Period / Product', 'Transactions', 'Units sold', 'Total sales (PHP)', 'Profit (PHP)', 'Average sale (PHP)', 'Starting inventory (units)', 'Ending inventory (units)', 'Inventory change (units)', 'Current inventory (units)', 'Product status'],
      ...reportRows.map((r) => {
        const total = Number(r.total_centavos) / 100;
        const profit = Number(r.profit_centavos ?? 0) / 100;
        const average = Number(r.txn_count || 0) > 0 ? total / Number(r.txn_count) : 0;
        return [
          'Sales',
          period === 'week' ? `Week of ${r.period_start}` : r.period_start.slice(0, 7),
          r.txn_count,
          r.qty_sold ?? 0,
          total.toFixed(2),
          profit.toFixed(2),
          average.toFixed(2),
          '',
          '',
          '',
          '',
          '',
        ];
      }),
    ];
    if (inventory) {
      csvRows.push(
        [],
        ['Inventory', `Opening total at start of ${inventory.starting_date}`, '', '', '', '', '', inventory.starting_units],
        ['Inventory', `Closing total at end of ${inventory.ending_date}`, '', '', '', '', '', '', inventory.ending_units],
        ['Inventory', 'Current total units', '', '', '', '', '', '', '', '', inventory.current_units],
        ...inventory.products.map((product) => [
          'Inventory',
          product.name,
          '',
          '',
          '',
          '',
          '',
          product.starting_qty,
          product.ending_qty,
          product.ending_qty - product.starting_qty,
          product.current_qty,
          product.is_active ? 'Active' : 'Archived',
        ]),
      );
    }
    const csv = csvRows.map((row) => row.map(escape).join(',')).join('\r\n');
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${period === 'week' ? 'weekly' : 'monthly'}-sales-${from}-to-${to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
  };
  const grand = dayRows.reduce((s, r) => s + Number(r.total_centavos), 0);
  const grandCount = dayRows.reduce((s, r) => s + Number(r.txn_count), 0);
  const reportTotals = reportRows.reduce((s, r) => ({
    txn_count: s.txn_count + Number(r.txn_count || 0),
    total_centavos: s.total_centavos + Number(r.total_centavos || 0),
    qty_sold: s.qty_sold + Number(r.qty_sold || 0),
    profit_centavos: s.profit_centavos + Number(r.profit_centavos || 0),
  }), { txn_count: 0, total_centavos: 0, qty_sold: 0, profit_centavos: 0 });
  const averageSale = reportTotals.txn_count > 0 ? reportTotals.total_centavos / reportTotals.txn_count : 0;
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Sales history</h1>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="flex flex-col"><label className="mb-1 text-sm font-medium" htmlFor="from">From</label><input id="from" type="date" className="input input-bordered" value={from} max={today} onChange={(e) => setRange(e.target.value, to)} /></div>
        <div className="flex flex-col"><label className="mb-1 text-sm font-medium" htmlFor="to">To</label><input id="to" type="date" className="input input-bordered" value={to} max={today} onChange={(e) => setRange(from, e.target.value)} /></div>
        <div className="flex flex-wrap gap-1">
          <button className="btn btn-outline btn-secondary" onClick={() => setRange(today, today)}>Today</button>
          <button className="btn btn-outline btn-secondary" onClick={() => setRange(addDays(today, -1), addDays(today, -1))}>Yesterday</button>
          <button className="btn btn-outline btn-secondary" onClick={() => setRange(addDays(today, -6), today)}>Last 7 days</button>
          <button className="btn btn-outline btn-secondary" onClick={setCurrentWeek}>This week</button>
          <button className="btn btn-outline btn-secondary" onClick={setCurrentMonth}>This month</button>
        </div>
      </div>
      {rangeError && <div className="alert alert-warning">{rangeError}</div>}
      <ErrorAlert error={list.error ?? days.error ?? report.error} onRetry={() => { list.reload(); days.reload(); report.reload(); }} />

      {isOwner && (
      <div className="card mb-3 border border-base-300 bg-base-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-base-300 px-4 py-3">
          <strong>{period === 'week' ? 'Weekly sales report' : 'Monthly sales report'}</strong>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="report-period">Report period</label>
            <select id="report-period" className="select select-bordered select-sm w-auto" value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
            <button className="btn btn-sm btn-primary" onClick={generateReport} disabled={Boolean(rangeError) || report.loading}>Generate summary of sales</button>
            <button className="btn btn-sm btn-outline btn-primary" onClick={downloadReport} disabled={!reportRequested || report.loading || Boolean(report.error) || (!reportRows.length && !inventory)}>Download CSV</button>
          </div>
        </div>
        {report.loading && reportRequested ? <Loading variant="table" /> : report.error ? null : !reportRequested ? <Empty>Choose weekly or monthly, then generate your sales summary.</Empty> : reportRows.length === 0 ? <Empty>No sales in this period.</Empty> : (
          <div className="overflow-x-auto"><table className="table table-xs mb-0">
            <thead><tr><th>{period === 'week' ? 'Week starting (Monday)' : 'Month'}</th><th className="text-right">Transactions</th><th className="text-right">Units sold</th><th className="text-right">Total sales</th><th className="text-right">Profit</th><th className="text-right">Average sale</th></tr></thead>
            <tbody>{reportRows.map((r) => {
              const total = Number(r.total_centavos);
              const profit = Number(r.profit_centavos ?? 0);
              const average = Number(r.txn_count || 0) > 0 ? total / Number(r.txn_count) : 0;
              return (
                <tr key={r.period_start}>
                  <td>{period === 'week' ? r.period_start : r.period_start.slice(0, 7)}</td>
                  <td className="money">{r.txn_count}</td>
                  <td className="money">{r.qty_sold ?? 0}</td>
                  <td className="money font-semibold">{pesos(total)}</td>
                  <td className={`money font-semibold ${profit >= 0 ? 'text-success' : 'text-error'}`}>{pesos(profit)}</td>
                  <td className="money">{pesos(average)}</td>
                </tr>
              );
            })}</tbody>
          </table>
          <div className="px-4 py-3 text-sm text-base-content/60">
            {reportTotals.txn_count} transactions · {reportTotals.qty_sold} units sold · Total {pesos(reportTotals.total_centavos)} · Profit {pesos(reportTotals.profit_centavos)} · Average {pesos(averageSale)}
          </div>
          </div>
        )}
        {!isOwner && <div className="border-t border-base-300 px-4 py-3 text-sm text-base-content/60">This report includes only the sales you rang up.</div>}
      </div>
     )}

      {isOwner && reportRequested && !report.loading && !report.error && inventory && (
        <div className="card mb-3 border border-base-300 bg-base-100 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-base-300 px-4 py-3">
            <strong>Inventory snapshot</strong>
            <span className="badge badge-primary">{inventory.current_units} total units currently in inventory</span>
          </div>
          <div className="card-body pb-0">
            <p className="text-sm text-base-content/60">Starting inventory is the stock at the beginning of {inventory.starting_date}. Ending inventory is the stock at the end of {inventory.ending_date}. Current inventory is the live stock when this report was generated.</p>
            <div className="grid grid-cols-12 gap-2 mb-3">
              <div className="col-span-6 md:col-span-4"><div className="border border-base-300 rounded-md p-3 h-full"><div className="text-sm text-base-content/60">Starting inventory · {inventory.starting_date}</div><strong className="text-xl">{inventory.starting_units} units</strong></div></div>
              <div className="col-span-6 md:col-span-4"><div className="border border-base-300 rounded-md p-3 h-full"><div className="text-sm text-base-content/60">Ending inventory · {inventory.ending_date}</div><strong className="text-xl">{inventory.ending_units} units</strong></div></div>
              <div className="col-span-6 md:col-span-4"><div className="border border-base-300 rounded-md p-3 h-full"><div className="text-sm text-base-content/60">Total units currently in inventory</div><strong className="text-xl">{inventory.current_units} units</strong></div></div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-xs mb-0">
              <thead><tr><th>Product</th><th>Status</th><th className="text-right">Starting stock</th><th className="text-right">Ending stock</th><th className="text-right">Change</th><th className="text-right">Current stock</th></tr></thead>
              <tbody>{inventory.products.map((product) => {
                const change = product.ending_qty - product.starting_qty;
                return (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.is_active ? 'Active' : 'Archived'}</td>
                    <td className="money">{product.starting_qty}</td>
                    <td className="money">{product.ending_qty}</td>
                    <td className={`money ${change < 0 ? 'text-error' : change > 0 ? 'text-success' : ''}`}>{change > 0 ? '+' : ''}{change}</td>
                    <td className="money font-semibold">{product.current_qty}</td>
                  </tr>
                );
              })}</tbody>
            </table>
            {inventory.products.length === 0 && <div className="p-3"><Empty>No products in inventory.</Empty></div>}
          </div>
        </div>
      )}

      {isOwner && dayRows.length > 0 && (
        <div className="card mb-3 border border-base-300 bg-base-100 shadow-sm">
          <div className="flex items-center justify-between border-b border-base-300 px-4 py-3"><strong>Daily sales</strong><span>{grandCount} sale(s) · <strong>{pesos(grand)}</strong></span></div>
          <table className="table table-xs mb-0"><thead><tr><th>Day</th><th className="text-right">Transactions</th><th className="text-right">Total sales</th></tr></thead>
            <tbody>{dayRows.map((r) => <tr key={r.day}><td>{r.day}</td><td className="money">{r.txn_count}</td><td className="money">{pesos(Number(r.total_centavos))}</td></tr>)}</tbody></table>
        </div>
      )}

      <div className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="table mb-0">
            <thead><tr><th>Transaction no.</th><th>Date &amp; time</th><th>Cashier</th><th className="text-right">Total</th><th className="text-right">Cash</th><th className="text-right">Change</th><th /></tr></thead>
            <tbody>{rows.map((s) => (
              <tr key={s.id}><td className="whitespace-nowrap">{s.txn_no}</td><td className="whitespace-nowrap">{formatDateTime(s.created_at)}</td><td>{s.cashier?.full_name}</td>
                <td className="money font-semibold">{pesos(s.total_centavos)}</td><td className="money">{pesos(s.cash_received_centavos)}</td><td className="money">{pesos(s.change_centavos)}</td>
                <td className="text-right"><button className="btn btn-sm btn-outline btn-primary" onClick={() => setViewing(s.id)}>View</button></td></tr>))}</tbody>
          </table>
        </div>
        {list.loading && !list.data && <Loading variant="table" />}
        {list.data && rows.length === 0 && <Empty>No sales in this period.</Empty>}
        <div className="flex items-center gap-2 border-t border-base-300 bg-base-100 px-4 py-3"><Pagination page={page} pageSize={pageSize} total={list.data?.total ?? 0} onPage={setPage} /></div>
      </div>
      {!isOwner && <p className="text-base-content/60 text-sm mt-2">You can see the sales you rang up.</p>}
      {viewing && <SaleDetail id={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
