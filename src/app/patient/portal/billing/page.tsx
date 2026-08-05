import { CheckCircle2, CreditCard, ReceiptText } from 'lucide-react';
import { requireRole } from '@/lib/auth';

function displayDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value))
    : '—';
}

export default async function PatientBilling() {
  const { user, supabase } = await requireRole(['PATIENT']);
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  const [{ data: invoices }, { data: settings }] = await Promise.all([
    patient
      ? supabase
          .from('invoices')
          .select('id, total_amount, paid_amount, status, created_at, invoice_items(id, description, quantity, unit_price, total_price), payments(id, amount, payment_method, reference_number, created_at)')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from('system_settings')
      .select('currency_symbol, currency_position, phone, email')
      .limit(1)
      .maybeSingle(),
  ]);

  const rows = invoices || [];
  const totalBilled = rows.reduce(
    (total, invoice) => total + Number(invoice.total_amount || 0),
    0,
  );
  const totalPaid = rows.reduce(
    (total, invoice) => total + Number(invoice.paid_amount || 0),
    0,
  );
  const symbol = settings?.currency_symbol || 'K';
  const money = (value: number) =>
    settings?.currency_position === 'suffix'
      ? value.toFixed(2) + ' ' + symbol
      : symbol + value.toFixed(2);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Billing</h1>
        <p className="mt-1 text-slate-500">Invoices, balances, and recorded payments.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Total billed', money(totalBilled)],
          ['Paid', money(totalPaid)],
          ['Outstanding', money(totalBilled - totalPaid)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-5">
        {rows.length ? (
          rows.map((invoice) => {
            const balance =
              Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0);
            return (
              <article
                key={invoice.id}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400">
                      Invoice {invoice.id.slice(0, 8)}
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-900">
                      {money(Number(invoice.total_amount || 0))}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {displayDate(invoice.created_at)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                      {invoice.status}
                    </span>
                    <p className="mt-3 text-sm font-bold text-slate-600">
                      Balance: {money(balance)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-6 border-t border-slate-100 pt-5 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-black">
                      <ReceiptText size={16} /> Charges
                    </h3>
                    {(invoice.invoice_items || []).map((item) => (
                      <p key={item.id} className="flex justify-between py-1 text-sm text-slate-600">
                        <span>
                          {item.description} × {item.quantity}
                        </span>
                        <span>{money(Number(item.total_price || 0))}</span>
                      </p>
                    ))}
                  </div>
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-black">
                      <CreditCard size={16} /> Payments
                    </h3>
                    {(invoice.payments || []).length ? (
                      (invoice.payments || []).map((payment) => (
                        <p key={payment.id} className="flex justify-between py-1 text-sm text-slate-600">
                          <span>
                            {payment.payment_method} · {displayDate(payment.created_at)}
                          </span>
                          <span className="font-bold text-emerald-600">
                            {money(Number(payment.amount || 0))}
                          </span>
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No payments recorded.</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <CheckCircle2 className="mx-auto text-emerald-500" size={36} />
            <p className="mt-3 font-bold text-slate-700">No invoices found.</p>
          </div>
        )}
      </section>

      <p className="rounded-xl bg-slate-900 p-4 text-sm text-slate-200">
        To make a payment, contact hospital billing
        {settings?.phone ? ' at ' + settings.phone : ''}
        {settings?.email ? ' or ' + settings.email : ''}.
      </p>
    </div>
  );
}
