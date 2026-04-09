"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Transaction {
    id: string;
    type: string;
    quantity: number;
    price: number;
    date: string;
    asset: {
        symbol: string;
        name: string;
        currency: string;
        type: string;
    }
}

export function TransactionsTable() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTx = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/transactions?portfolioId=main-portfolio');
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTx();
    }, []);

    if (loading) {
        return <div className="py-12 flex justify-center text-slate-500 animate-pulse"><RefreshCw className="w-6 h-6 animate-spin" /></div>;
    }

    if (transactions.length === 0) {
        return <div className="py-12 text-center text-slate-500 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">No transactions recorded yet.</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                        <th className="p-4 font-semibold">Date</th>
                        <th className="p-4 font-semibold">Asset</th>
                        <th className="p-4 font-semibold">Type</th>
                        <th className="p-4 font-semibold text-right">Quantity</th>
                        <th className="p-4 font-semibold text-right">Price (Native)</th>
                        <th className="p-4 font-semibold text-right">Total (Native)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="p-4 whitespace-nowrap text-sm text-slate-300">
                                {format(new Date(tx.date), "MMM dd, yyyy HH:mm")}
                            </td>
                            <td className="p-4">
                                <div className="font-semibold text-slate-200">{tx.asset.name}</div>
                                <div className="text-xs text-slate-500 uppercase">{tx.asset.symbol} • {tx.asset.type}</div>
                            </td>
                            <td className="p-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${tx.type === 'BUY' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                    {tx.type === 'BUY' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {tx.type}
                                </span>
                            </td>
                            <td className="p-4 text-right font-medium text-slate-300">
                                {tx.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                            </td>
                            <td className="p-4 text-right text-sm text-slate-400">
                                {tx.asset.currency === 'USD' ? `$${tx.price.toFixed(2)}` : `₹${tx.price.toFixed(2)}`}
                            </td>
                            <td className="p-4 text-right font-bold text-slate-200">
                                {tx.asset.currency === 'USD' ? formatCurrency(tx.quantity * tx.price) : `₹${(tx.quantity * tx.price).toFixed(2)}`}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
