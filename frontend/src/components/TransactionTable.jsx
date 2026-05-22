const icons = {
  Food: "🍔", Transport: "🚗", Bills: "📄", Subscription: "📱",
  PayLater: "💳", Shopping: "🛍", Entertainment: "🎮", Emergency: "🆘", Others: "📦",
};

export default function TransactionTable({ transactions, onDelete }) {
  if (!transactions?.length) {
    return <p className="text-center py-10 text-white/20 text-sm">No transactions yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-left">
            <th className="pb-2.5 text-[10px] text-white/25 uppercase tracking-wider font-medium">Name</th>
            <th className="pb-2.5 text-[10px] text-white/25 uppercase tracking-wider font-medium">Category</th>
            <th className="pb-2.5 text-[10px] text-white/25 uppercase tracking-wider font-medium">Date</th>
            <th className="pb-2.5 text-[10px] text-white/25 uppercase tracking-wider font-medium text-right">Amount</th>
            {onDelete && <th className="pb-2.5 w-6" />}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors">
              <td className="py-2.5 font-medium text-white/80 text-xs">{tx.name}</td>
              <td className="py-2.5 text-white/40 text-xs">{icons[tx.category]} {tx.category}</td>
              <td className="py-2.5 text-white/30 text-xs">{tx.date}</td>
              <td className="py-2.5 text-right font-semibold text-white/70 text-xs">RM{tx.amount.toFixed(2)}</td>
              {onDelete && (
                <td className="py-2.5 text-center">
                  <button onClick={() => onDelete(tx.id)}
                    className="text-white/15 hover:text-red-400 text-xs transition-colors">✕</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
