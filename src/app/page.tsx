'use client';

import { useEffect, useState, startTransition } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './dashboard.module.css';
import { formatXOF } from '@/lib/format';

interface ProductMargin {
  id: string;
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
  costStockSold: number;
  shippingFees: number;
  netProfit: number;
}

interface ChannelRoi {
  channel: string;
  spend: number;
  revenue: number;
  roi: number;
  orderCount: number;
}

interface EvolutionData {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface DashboardData {
  revenue: number;
  revenuePotentiel: number;
  confirmedOrdersCount: number;
  totalExpenses: number;
  profitNet: number;
  expensesBreakdown: {
    merchandise: number;
    advertising: number;
    shipping: number;
    other: number;
  };
  rates: {
    total: number;
    delivery: number;
    return: number;
    cancellation: number;
    delivered: number;
    returned: number;
    cancelled: number;
    pending: number;
  };
  productMargins: ProductMargin[];
  channelRoi: ChannelRoi[];
  evolution: EvolutionData[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Period filters
  const [period, setPeriod] = useState<'today' | '7days' | '30days' | 'thismonth' | 'custom'>('30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const calculateDates = (selectedPeriod: typeof period) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (selectedPeriod === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (selectedPeriod === '7days') {
      start.setDate(today.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (selectedPeriod === '30days') {
      start.setDate(today.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (selectedPeriod === 'thismonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
      // custom, leave dates as they are
      return;
    }

    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);

      const res = await fetch(`/api/reports/dashboard?${query.toString()}`);
      if (!res.ok) throw new Error('Impossible de charger le rapport du tableau de bord.');
      const report = await res.json();
      setData(report);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  // Run on mount and filter changes
  useEffect(() => {
    calculateDates(period);
  }, [period]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [startDate, endDate]);

  const handlePeriodChange = (newPeriod: typeof period) => {
    startTransition(() => {
      setPeriod(newPeriod);
    });
  };

  // Client-Side CSV Exporters
  const handleExportOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Impossible de charger les données des commandes.');
      const orders = await res.json();

      let csv = 'ID,Date,Client,Telephone,Ville,Adresse,Produit,SKU,Quantite,Prix Vente,Total,Statut,Livreur,Frais Livraison,Encaisse,Note,Saisi par\r\n';
      
      orders.forEach((o: any) => {
        const row = [
          o.id.substring(0, 8),
          o.dateOrder.substring(0, 10),
          `"${o.clientName.replace(/"/g, '""')}"`,
          `"${o.clientTel}"`,
          `"${o.clientCity}"`,
          `"${(o.clientAddress || '').replace(/"/g, '""')}"`,
          `"${o.product?.name.replace(/"/g, '""')}"`,
          `"${o.product?.sku}"`,
          o.quantity,
          o.prixVente,
          o.prixVente * o.quantity,
          o.status,
          `"${o.courierName || ''}"`,
          o.shippingFee,
          o.amountCollected,
          `"${(o.note || '').replace(/\r?\n|\r/g, ' ').replace(/"/g, '""')}"`,
          `"${o.createdBy?.name || ''}"`
        ];
        csv += row.join(',') + '\r\n';
      });

      downloadCSV(csv, 'export_commandes.csv');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      if (!res.ok) throw new Error('Impossible de charger les données des dépenses.');
      const expenses = await res.json();

      let csv = 'ID,Date,Categorie,Sous-Categorie,Montant Devise,Devise,Taux Change,Montant FCFA,Description,Saisi par\r\n';

      expenses.forEach((e: any) => {
        const row = [
          e.id.substring(0, 8),
          e.date.substring(0, 10),
          `"${e.category}"`,
          `"${e.subcategory || ''}"`,
          e.amount,
          e.currency,
          e.exchangeRate,
          e.amountXof,
          `"${(e.description || '').replace(/\r?\n|\r/g, ' ').replace(/"/g, '""')}"`,
          `"${e.createdBy?.name || 'Système'}"`
        ];
        csv += row.join(',') + '\r\n';
      });

      downloadCSV(csv, 'export_depenses.csv');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find max value in evolution data to scale the CSS chart height
  const maxEvolutionValue = data ? Math.max(...data.evolution.map(d => Math.max(d.revenue, d.expenses, d.profit, 1))) : 1;

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-title">
          <h1>Tableau de Bord & Rentabilité</h1>
          <p>Suivez en temps réel la santé financière de votre activité e-commerce COD</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={handleExportOrders}>
            Export Commandes CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExportExpenses}>
            Export Dépenses CSV
          </button>
        </div>
      </div>

      {/* Date & Period filter */}
      <div className={styles.filterBar}>
        <div className={styles.btnGroup}>
          <button className={`${styles.btnGroupBtn} ${period === 'today' ? styles.btnGroupBtnActive : ''}`} onClick={() => handlePeriodChange('today')}>
            Aujourd'hui
          </button>
          <button className={`${styles.btnGroupBtn} ${period === '7days' ? styles.btnGroupBtnActive : ''}`} onClick={() => handlePeriodChange('7days')}>
            7 Derniers Jours
          </button>
          <button className={`${styles.btnGroupBtn} ${period === '30days' ? styles.btnGroupBtnActive : ''}`} onClick={() => handlePeriodChange('30days')}>
            30 Derniers Jours
          </button>
          <button className={`${styles.btnGroupBtn} ${period === 'thismonth' ? styles.btnGroupBtnActive : ''}`} onClick={() => handlePeriodChange('thismonth')}>
            Ce Mois
          </button>
          <button className={`${styles.btnGroupBtn} ${period === 'custom' ? styles.btnGroupBtnActive : ''}`} onClick={() => handlePeriodChange('custom')}>
            Période Personnalisée
          </button>
        </div>

        {period === 'custom' && (
          <div className={styles.dateInputs}>
            <input type="date" className="form-input" style={{ width: 140 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)' }}>au</span>
            <input type="date" className="form-input" style={{ width: 140 }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        )}
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: 20 }}>{error}</div>}

      {loading || !data ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Calcul des KPIs financiers...</div>
      ) : (
        <>
          {/* Key Financials */}
          <div className={styles.financialsGrid}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 24 }}>
              <span className={styles.rateLabel}>Chiffre d'Affaires Encaissé</span>
              <span className={`${styles.rateVal} ${styles.valueGreen}`} style={{ display: 'inline-block', fontSize: '28px', marginTop: 8 }}>
                {formatXOF(data.revenue)}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>Paiements COD reçus de commandes livrées</span>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 24 }}>
              <span className={styles.rateLabel}>Dépenses Totales</span>
              <span className={`${styles.rateVal} ${styles.valueRed}`} style={{ display: 'inline-block', fontSize: '28px', marginTop: 8 }}>
                {formatXOF(data.totalExpenses)}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>Stocks + Publicité + Logistique + Autres</span>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 24 }}>
              <span className={styles.rateLabel}>Profit Net Réel</span>
              <span className={`${styles.rateVal} ${styles.valueYellow}`} style={{ display: 'inline-block', fontSize: '28px', marginTop: 8 }}>
                {formatXOF(data.profitNet)}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>Bénéfice direct de la période après charges</span>
            </div>
          </div>

          {/* Pending Revenue Banner */}
          {data.revenuePotentiel > 0 && (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', border: '1px solid rgba(251, 191, 36, 0.4)', background: 'rgba(251, 191, 36, 0.07)', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>⏳</span>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>CA En Attente de Livraison</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 2 }}>{data.confirmedOrdersCount} commande(s) confirmée(s) ou en cours de livraison</div>
                </div>
              </div>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#fbbf24' }}>{formatXOF(data.revenuePotentiel)}</span>
            </div>
          )}

          {/* Operational Rates */}
          <div className={styles.ratesGrid}>
            <div className={styles.rateCard}>
              <div className={styles.rateHeader}>
                <span className={styles.rateLabel}>Taux de Livraison</span>
                <span style={{ color: 'var(--success)', fontWeight: 800 }}>{data.rates.delivered}</span>
              </div>
              <span className={styles.rateVal}>{data.rates.delivery.toFixed(1)}%</span>
              <div className={styles.progressBarContainer}>
                <div className={`${styles.progressBar} ${styles.progressBarGreen}`} style={{ width: `${data.rates.delivery}%` }}></div>
              </div>
            </div>

            <div className={styles.rateCard}>
              <div className={styles.rateHeader}>
                <span className={styles.rateLabel}>Taux de Retour</span>
                <span style={{ color: 'var(--danger)', fontWeight: 800 }}>{data.rates.returned}</span>
              </div>
              <span className={styles.rateVal}>{data.rates.return.toFixed(1)}%</span>
              <div className={styles.progressBarContainer}>
                <div className={`${styles.progressBar} ${styles.progressBarRed}`} style={{ width: `${data.rates.return}%` }}></div>
              </div>
            </div>

            <div className={styles.rateCard}>
              <div className={styles.rateHeader}>
                <span className={styles.rateLabel}>Taux d'Annulation</span>
                <span style={{ color: 'var(--danger)', fontWeight: 800 }}>{data.rates.cancelled}</span>
              </div>
              <span className={styles.rateVal}>{data.rates.cancellation.toFixed(1)}%</span>
              <div className={styles.progressBarContainer}>
                <div className={`${styles.progressBar} ${styles.progressBarRed}`} style={{ width: `${data.rates.cancellation}%` }}></div>
              </div>
            </div>

            <div className={styles.rateCard}>
              <div className={styles.rateHeader}>
                <span className={styles.rateLabel}>Commandes en Attente</span>
                <span style={{ color: 'var(--info)', fontWeight: 800 }}>{data.rates.pending}</span>
              </div>
              <span className={styles.rateVal}>{data.rates.total} commandées</span>
              <div className={styles.progressBarContainer}>
                <div className={`${styles.progressBar} ${styles.progressBarInfo}`} style={{ width: `${data.rates.total > 0 ? (data.rates.pending / data.rates.total) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>

          {/* Sparkline Daily CSS profit evolution bar chart */}
          {data.evolution.length > 0 && (
            <div className={styles.chartContainer}>
              <div className={styles.chartHeader}>
                <span className={styles.chartTitle}>Évolution Journalière du Chiffre d'Affaires</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Mise à jour en direct</span>
              </div>
              <div className={styles.barChart}>
                {data.evolution.map((day) => {
                  const percentage = (day.revenue / maxEvolutionValue) * 100;
                  const formatDayStr = day.date.substring(8, 10) + '/' + day.date.substring(5, 7);
                  return (
                    <div className={styles.chartBarWrapper} key={day.date} title={`${day.date} : CA ${formatXOF(day.revenue)} / Charges ${formatXOF(day.expenses)}`}>
                      <div className={styles.chartBar} style={{ height: `${Math.max(percentage, 2)}%` }}></div>
                      <span className={styles.chartDate}>{formatDayStr}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Margins per product & Channel spends */}
          <div className={styles.detailsGrid}>
            {/* PRODUCT MARGINS */}
            <div className="card" style={{ padding: '24px 20px' }}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Marge Net par Produit (Lots)</span>
              </div>
              <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
                <table className="table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>SKU</th>
                      <th>Vendus</th>
                      <th>C.A.</th>
                      <th>Coût Stock</th>
                      <th>Frais Livr.</th>
                      <th style={{ textAlign: 'right' }}>Marge Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.productMargins.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Aucun produit vendu</td>
                      </tr>
                    ) : (
                      data.productMargins.map((pm) => (
                        <tr key={pm.id}>
                          <td style={{ fontWeight: 700 }}>{pm.name}</td>
                          <td><code>{pm.sku}</code></td>
                          <td>{pm.unitsSold} u.</td>
                          <td>{formatXOF(pm.revenue)}</td>
                          <td>{formatXOF(pm.costStockSold)}</td>
                          <td>{formatXOF(pm.shippingFees)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: pm.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {formatXOF(pm.netProfit)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CHANNEL ADS SPEND & ROI */}
            <div className="card" style={{ padding: '24px 20px' }}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>ROI Publicitaire & Acquisition</span>
              </div>
              <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
                <table className="table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Canal / Source</th>
                      <th>Cmds</th>
                      <th>Dépense Pub</th>
                      <th>CA Généré</th>
                      <th style={{ textAlign: 'right' }}>ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.channelRoi.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Aucune donnée publicitaire</td>
                      </tr>
                    ) : (
                      data.channelRoi.map((cr) => (
                        <tr key={cr.channel}>
                          <td style={{ fontWeight: 700 }}>{cr.channel}</td>
                          <td>{cr.orderCount}</td>
                          <td style={{ color: 'var(--danger)' }}>{formatXOF(cr.spend)}</td>
                          <td style={{ color: 'var(--success)' }}>{formatXOF(cr.revenue)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: cr.roi >= 100 ? 'var(--success)' : 'var(--text-secondary)' }}>
                            {cr.roi.toFixed(0)}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
