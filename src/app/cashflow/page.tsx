'use client';

import { useEffect, useState, startTransition } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './cashflow.module.css';
import { formatXOF, formatDate } from '@/lib/format';

interface Order {
  id: string;
  productId: string;
  product: { name: string; sku: string };
  quantity: number;
  clientName: string;
  clientTel: string;
  clientCity: string;
  prixVente: number;
  status: string;
  courierName?: string;
  shippingFee: number;
  amountCollected: number;
  dateOrder: string;
  dateDelivery?: string | null;
  note?: string;
}

export default function CashflowPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [filterCourier, setFilterCourier] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      // Fetch only orders that are in delivery or delivered
      // We will filter them on the client side or fetch all and filter
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Impossible de charger les flux financiers.');
      const data = await res.json();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter orders related to COD (either in delivery, delivered/paid, or returned)
  const codOrders = orders.filter((o) => {
    const isCodStatus = ['En livraison', 'Livree', 'Retournee'].includes(o.status);
    if (!isCodStatus) return false;

    // Apply client-side filters
    if (filterCourier && (!o.courierName || !o.courierName.toLowerCase().includes(filterCourier.toLowerCase()))) return false;
    if (filterCity && o.clientCity !== filterCity) return false;

    if (filterStartDate || filterEndDate) {
      const orderDate = new Date(o.dateOrder);
      if (filterStartDate && orderDate < new Date(filterStartDate)) return false;
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
    }

    return true;
  });

  // Calculate totals
  const totalEncaiss = codOrders.filter((o) => o.status === 'Livree').reduce((sum, o) => sum + o.amountCollected, 0);
  const totalEnAttente = codOrders.filter((o) => o.status === 'En livraison' || o.status === 'Confirmee').reduce((sum, o) => sum + (o.prixVente * o.quantity), 0);
  
  // Rapprochement gap: expected sales of Delivered orders vs actual cash collected on Delivered orders
  const totalAttenduLivree = codOrders.filter((o) => o.status === 'Livree').reduce((sum, o) => sum + (o.prixVente * o.quantity), 0);
  const totalEcart = totalAttenduLivree - totalEncaiss;

  const uniqueCities = Array.from(new Set(orders.map((o) => o.clientCity))).filter(Boolean);

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-title">
          <h1>Suivi Encaissements & Trésorerie</h1>
          <p>Assurez le rapprochement financier entre les prix de vente et les encaissements réels des livreurs</p>
        </div>
      </div>

      {/* Summary Row */}
      <div className={styles.reconciliationSummary}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>COD Encaissé Réel</span>
          <span className={`${styles.summaryValue} ${styles.summaryValueSuccess}`}>{formatXOF(totalEncaiss)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>En Attente de Livraison</span>
          <span className={`${styles.summaryValue} ${styles.summaryValueYellow}`}>{formatXOF(totalEnAttente)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Écart de Rapprochement (Pertes/Remises)</span>
          <span className={`${styles.summaryValue} ${totalEcart > 0 ? styles.summaryValueWarning : ''}`}>
            {formatXOF(totalEcart)}
          </span>
        </div>
      </div>

      {/* Filter panel */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Livreur / Transporteur</label>
          <input
            type="text"
            className="form-input"
            placeholder="ex: Moussa"
            value={filterCourier}
            onChange={(e) => setFilterCourier(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Ville</label>
          <select className="form-select" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
            <option value="">Toutes les villes</option>
            {uniqueCities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Date Début</label>
          <input type="date" className="form-input" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Date Fin</label>
          <input type="date" className="form-input" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
        </div>
        <button className="btn btn-secondary" style={{ height: '38px' }} onClick={fetchOrders}>
          Actualiser
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Chargement en cours...</div>
      ) : (
        <>
          {/* DESKTOP RECONCILIATION TABLE */}
          <div className={`${styles.desktopTable} table-container`}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date Livraison</th>
                  <th>Client / Téléphone</th>
                  <th>Livreur</th>
                  <th>Produit (Qté)</th>
                  <th>Montant Commande</th>
                  <th>Frais Livr.</th>
                  <th>Encaissé Réel</th>
                  <th>Écart</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {codOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Aucun flux COD trouvé</td>
                  </tr>
                ) : (
                  codOrders.map((o) => {
                    const expectedTotal = o.prixVente * o.quantity;
                    const ecart = o.status === 'Livree' ? (expectedTotal - o.amountCollected) : 0;
                    const hasDiscrepancy = ecart !== 0;

                    return (
                      <tr key={o.id} className={hasDiscrepancy ? styles.discrepancyRow : ''}>
                        <td>{o.dateDelivery ? formatDate(o.dateDelivery) : formatDate(o.dateOrder)}</td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{o.clientName}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{o.clientTel} — {o.clientCity}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{o.courierName || '-'}</td>
                        <td>{o.product?.name} (x{o.quantity})</td>
                        <td style={{ fontWeight: 700 }}>{formatXOF(expectedTotal)}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{formatXOF(o.shippingFee)}</td>
                        <td style={{ fontWeight: 800, color: 'var(--accent)' }}>
                          {o.status === 'Livree' ? formatXOF(o.amountCollected) : '-'}
                        </td>
                        <td className={hasDiscrepancy ? styles.discrepancyCell : styles.exactCell}>
                          {o.status === 'Livree' ? (ecart === 0 ? 'Exact' : formatXOF(ecart)) : 'En attente'}
                        </td>
                        <td>
                          <span className={`badge ${
                            o.status === 'Livree' ? 'status-success' : o.status === 'Retournee' ? 'status-danger' : 'status-warning'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE RECONCILIATION CARDS */}
          <div className={styles.pendingCardList}>
            {codOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>Aucun flux COD trouvé</div>
            ) : (
              codOrders.map((o) => {
                const expectedTotal = o.prixVente * o.quantity;
                const ecart = o.status === 'Livree' ? (expectedTotal - o.amountCollected) : 0;
                const hasDiscrepancy = ecart !== 0;

                return (
                  <div className={`${styles.pendingCard} ${hasDiscrepancy ? styles.discrepancyRow : ''}`} key={o.id}>
                    <div className={styles.cardHeader}>
                      <div>
                        <div className={styles.cardTitle}>{o.clientName}</div>
                        <div className={styles.cardMeta}>{o.clientTel} — {o.clientCity}</div>
                      </div>
                      <span className={`badge ${
                        o.status === 'Livree' ? 'status-success' : o.status === 'Retournee' ? 'status-danger' : 'status-warning'
                      }`}>
                        {o.status}
                      </span>
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.cardRow}>
                        <span className={styles.cardRowLabel}>Livreur :</span>
                        <span className={styles.cardRowVal}>{o.courierName || '-'}</span>
                      </div>
                      <div className={styles.cardRow}>
                        <span className={styles.cardRowLabel}>Produit :</span>
                        <span className={styles.cardRowVal}>{o.product?.name} (x{o.quantity})</span>
                      </div>
                      <div className={styles.cardRow}>
                        <span className={styles.cardRowLabel}>Attendu :</span>
                        <span className={styles.cardRowVal}>{formatXOF(expectedTotal)}</span>
                      </div>
                      <div className={styles.cardRow}>
                        <span className={styles.cardRowLabel}>Encaissé Réel :</span>
                        <span className={styles.cardRowVal} style={{ color: 'var(--accent)' }}>
                          {o.status === 'Livree' ? formatXOF(o.amountCollected) : 'En attente'}
                        </span>
                      </div>
                    </div>

                    {o.status === 'Livree' && (
                      <div className={styles.cardFooter}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Rapprochement :</span>
                        <span className={hasDiscrepancy ? styles.discrepancyCell : styles.exactCell}>
                          {ecart === 0 ? 'Montant Exact' : `Écart: ${formatXOF(ecart)}`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
