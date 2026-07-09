'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './orders.module.css';
import { formatXOF, formatDate } from '@/lib/format';

interface Product {
  id: string;
  name: string;
  sku: string;
  prixVenteActuel: number;
}

interface Order {
  id: string;
  productId: string;
  product: { name: string; sku: string; prixVenteActuel: number };
  quantity: number;
  clientName: string;
  clientTel: string;
  clientAddress?: string;
  clientCity: string;
  source: string;
  campaign?: string;
  prixVente: number;
  status: string;
  courierName?: string;
  shippingFee: number;
  amountCollected: number;
  dateOrder: string;
  dateDelivery?: string | null;
  confirmedByTel: boolean;
  confirmedAt?: string | null;
  note?: string;
  createdBy?: { name: string } | null;
  createdAt: string;
}

const CITIES = [
  'Dakar', 'Thiès', 'Mbour', 'Rufisque', 'Saint-Louis', 
  'Touba', 'Kaolack', 'Ziguinchor', 'Autre'
];

const CHANNELS = [
  'Meta Ads', 'Organique Facebook',
  'TikTok Organic', 'Instagram', 'WhatsApp', 'Autre'
];

const STATUSES = [
  'Nouvelle', 'Confirmee', 'En livraison', 'Livree', 
  'Retournee', 'Annulee', 'Injoignable'
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Form State
  const [ordProductId, setOrdProductId] = useState('');
  const [ordQty, setOrdQty] = useState('1');
  const [ordClientName, setOrdClientName] = useState('');
  const [ordClientTel, setOrdClientTel] = useState('');
  const [ordClientAddress, setOrdClientAddress] = useState('');
  const [ordClientCity, setOrdClientCity] = useState('Dakar');
  const [ordSource, setOrdSource] = useState('Meta Ads');
  const [ordCampaign, setOrdCampaign] = useState('');
  const [ordPrice, setOrdPrice] = useState('');
  const [ordStatus, setOrdStatus] = useState('Nouvelle');
  const [ordCourier, setOrdCourier] = useState('');
  const [ordShippingFee, setOrdShippingFee] = useState('0');
  const [ordCollected, setOrdCollected] = useState('0');
  const [isCollectedManuallyEdited, setIsCollectedManuallyEdited] = useState(false);
  const [ordDateOrder, setOrdDateOrder] = useState(new Date().toISOString().substring(0, 10));
  const [ordDateDelivery, setOrdDateDelivery] = useState('');
  const [ordConfirmed, setOrdConfirmed] = useState(false);
  const [ordNote, setOrdNote] = useState('');

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [resProd, resOrd] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/orders'),
      ]);

      if (!resProd.ok || !resOrd.ok) {
        throw new Error('Erreur de chargement des données.');
      }

      const prods = await resProd.json();
      const ords = await resOrd.json();

      setProducts(prods);
      setOrders(ords);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Auto-calculate collected amount based on price, quantity and shipping if not overridden
  useEffect(() => {
    if (!isCollectedManuallyEdited) {
      const price = parseFloat(ordPrice) || 0;
      const qty = parseInt(ordQty) || 1;
      const shipping = parseFloat(ordShippingFee) || 0;
      setOrdCollected((price * qty + shipping).toString());
    }
  }, [ordPrice, ordQty, ordShippingFee, isCollectedManuallyEdited]);

  // Compute filtered orders on the fly (client-side matching)
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Search Query Match
      if (filterSearch) {
        const query = filterSearch.toLowerCase();
        const nameMatch = o.clientName?.toLowerCase().includes(query);
        const telMatch = o.clientTel?.includes(query);
        const idMatch = o.id?.toLowerCase().includes(query);
        const prodMatch = o.product?.name?.toLowerCase().includes(query);
        const skuMatch = o.product?.sku?.toLowerCase().includes(query);
        const courierMatch = o.courierName?.toLowerCase().includes(query);
        
        if (!nameMatch && !telMatch && !idMatch && !prodMatch && !skuMatch && !courierMatch) {
          return false;
        }
      }

      // 2. Exact Filters Match
      if (filterStatus && o.status !== filterStatus) return false;
      if (filterSource && o.source !== filterSource) return false;
      if (filterCity && o.clientCity !== filterCity) return false;
      if (filterProduct && o.productId !== filterProduct) return false;

      // 3. Date Filters Match
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
  }, [orders, filterSearch, filterStatus, filterSource, filterCity, filterProduct, filterStartDate, filterEndDate]);

  const handleProductChange = (prodId: string) => {
    setOrdProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setOrdPrice(prod.prixVenteActuel.toString());
    }
  };

  // Submit Order (Create / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const body = {
      productId: ordProductId,
      quantity: parseInt(ordQty),
      clientName: ordClientName,
      clientTel: ordClientTel,
      clientAddress: ordClientAddress,
      clientCity: ordClientCity,
      source: ordSource,
      campaign: ordCampaign,
      prixVente: parseFloat(ordPrice),
      status: ordStatus,
      courierName: ordCourier,
      shippingFee: parseFloat(ordShippingFee),
      amountCollected: parseFloat(ordCollected || ordPrice),
      dateOrder: new Date(ordDateOrder).toISOString(),
      dateDelivery: ordDateDelivery ? new Date(ordDateDelivery).toISOString() : null,
      confirmedByTel: ordConfirmed,
      note: ordNote,
    };

    try {
      const url = editingOrder ? `/api/orders/${editingOrder.id}` : '/api/orders';
      const method = editingOrder ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de sauvegarde de la commande.');
      }

      setIsModalOpen(false);
      setEditingOrder(null);
      resetForm();
      fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditOrder = (o: Order) => {
    setEditingOrder(o);
    setOrdProductId(o.productId);
    setOrdQty(o.quantity.toString());
    setOrdClientName(o.clientName);
    setOrdClientTel(o.clientTel);
    setOrdClientAddress(o.clientAddress || '');
    setOrdClientCity(o.clientCity);
    setOrdSource(o.source);
    setOrdCampaign(o.campaign || '');
    setOrdPrice(o.prixVente.toString());
    setOrdStatus(o.status);
    setOrdCourier(o.courierName || '');
    setOrdShippingFee(o.shippingFee.toString());
    setOrdCollected(o.amountCollected.toString());
    
    // Determine if the collected amount was custom or calculated
    const isAuto = o.amountCollected === (o.quantity * o.prixVente + o.shippingFee);
    setIsCollectedManuallyEdited(!isAuto);

    setOrdDateOrder(o.dateOrder.substring(0, 10));
    setOrdDateDelivery(o.dateDelivery ? o.dateDelivery.substring(0, 10) : '');
    setOrdConfirmed(o.confirmedByTel);
    setOrdNote(o.note || '');
    setIsModalOpen(true);
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('Êtes-vous sûr de supprimer cette commande ? Cette action annulera sa réservation de stock.')) return;
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Impossible de supprimer la commande.');
      fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleQuickConfirm = async (o: Order) => {
    try {
      const res = await fetch(`/api/orders/${o.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...o,
          confirmedByTel: true,
          status: o.status === 'Nouvelle' ? 'Confirmee' : o.status,
        }),
      });

      if (!res.ok) throw new Error('Erreur de confirmation rapide.');
      fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    if (products.length > 0) {
      setOrdProductId(products[0].id);
      setOrdPrice(products[0].prixVenteActuel.toString());
    } else {
      setOrdProductId('');
      setOrdPrice('');
    }
    setOrdQty('1');
    setOrdClientName('');
    setOrdClientTel('');
    setOrdClientAddress('');
    setOrdClientCity('Dakar');
    setOrdSource('Meta Ads');
    setOrdCampaign('');
    setOrdStatus('Nouvelle');
    setOrdCourier('');
    setOrdShippingFee('0');
    setOrdCollected('0');
    setIsCollectedManuallyEdited(false);
    setOrdDateOrder(new Date().toISOString().substring(0, 10));
    setOrdDateDelivery('');
    setOrdConfirmed(false);
    setOrdNote('');
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-title">
          <h1>Commandes Clients (Ventes COD)</h1>
          <p>Enregistrez et pilotez le statut des commandes clients</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setEditingOrder(null);
            setIsModalOpen(true);
          }}
        >
          + Nouvelle Commande (30s)
        </button>
      </div>

      {/* Filters Panel */}
      <div className={styles.filterGrid}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Recherche rapide</label>
          <input
            type="text"
            className="form-input"
            placeholder="Nom, Téléphone, SKU, Livreur..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Statut</label>
          <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Acquisition</label>
          <select className="form-select" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="">Tous les canaux</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Ville</label>
          <select className="form-select" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
            <option value="">Toutes les villes</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Produit</label>
          <select className="form-select" value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
            <option value="">Tous les produits</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
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
        <div className={styles.filterGroup} style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" style={{ height: '38px', width: '100%' }} onClick={fetchInitialData}>
            Actualiser
          </button>
        </div>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Chargement en cours...</div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className={`${styles.desktopTable} table-container`}>
            <table className="table">
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Produit / Qté</th>
                  <th>Total (FCFA)</th>
                  <th>Canal</th>
                  <th>Confirmation</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Aucune commande trouvée</td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 800, color: 'var(--text-secondary)' }}><code>{o.id}</code></td>
                      <td>{formatDate(o.dateOrder)}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{o.clientName}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{o.clientTel}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{o.clientCity} {o.clientAddress && `- ${o.clientAddress}`}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.product?.name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Qté : {o.quantity}</div>
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--accent)' }}>{formatXOF(o.prixVente * o.quantity)}</td>
                      <td>
                        <div>{o.source}</div>
                        {o.campaign && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{o.campaign}</div>}
                      </td>
                      <td>
                        {o.confirmedByTel ? (
                          <span className={styles.confirmedStamp}>
                            ✓ Confirmée
                          </span>
                        ) : (
                          <button className={styles.quickConfirmBtn} onClick={() => handleQuickConfirm(o)}>
                            Confirmer
                          </button>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          o.status === 'Livree' ? 'status-success' : 
                          o.status === 'Retournee' || o.status === 'Annulee' ? 'status-danger' : 
                          o.status === 'En livraison' || o.status === 'Confirmee' ? 'status-warning' : 'status-info'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => handleEditOrder(o)}>
                            Éditer
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12, borderColor: 'rgba(239,68,68,0.2)', color: 'var(--danger)' }} onClick={() => handleDeleteOrder(o.id)}>
                            Suppr.
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD VIEW */}
          <div className={styles.cardList}>
            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>Aucune commande trouvée</div>
            ) : (
              filteredOrders.map((o) => (
                <div className={styles.orderCard} key={o.id}>
                  <div className={styles.cardHeader}>
                    <div>
                      <div className={styles.cardTitle}>{o.clientName}</div>
                      <div className={styles.cardMeta}>{o.clientTel} — {o.clientCity}</div>
                    </div>
                    <span className={`badge ${
                      o.status === 'Livree' ? 'status-success' : 
                      o.status === 'Retournee' || o.status === 'Annulee' ? 'status-danger' : 
                      o.status === 'En livraison' || o.status === 'Confirmee' ? 'status-warning' : 'status-info'
                    }`}>
                      {o.status}
                    </span>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardRow}>
                      <span className={styles.cardRowLabel}>Réf :</span>
                      <span className={styles.cardRowVal} style={{ fontSize: 12 }}><code>{o.id}</code></span>
                    </div>
                    <div className={styles.cardRow}>
                      <span className={styles.cardRowLabel}>Produit :</span>
                      <span className={styles.cardRowVal}>{o.product?.name} (x{o.quantity})</span>
                    </div>
                    <div className={styles.cardRow}>
                      <span className={styles.cardRowLabel}>Total :</span>
                      <span className={styles.cardRowVal} style={{ color: 'var(--accent)', fontWeight: 800 }}>{formatXOF(o.prixVente * o.quantity)}</span>
                    </div>
                    <div className={styles.cardRow}>
                      <span className={styles.cardRowLabel}>Canal :</span>
                      <span className={styles.cardRowVal}>{o.source}</span>
                    </div>
                    {o.note && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6 }}>
                        Note: {o.note}
                      </div>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    <div>
                      {o.confirmedByTel ? (
                        <span className={styles.confirmedStamp}>✓ Confirmée</span>
                      ) : (
                        <button className={styles.quickConfirmBtn} onClick={() => handleQuickConfirm(o)}>
                          Confirmer
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleEditOrder(o)}>
                        Modifier
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12, borderColor: 'rgba(239,68,68,0.2)', color: 'var(--danger)' }} onClick={() => handleDeleteOrder(o.id)}>
                        Suppr.
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ORDER DIALOG / MODAL (SAISIE RAPIDE) */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingOrder ? 'Modifier la Commande' : 'Saisir une Commande'}</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                {products.length === 0 ? (
                  <div style={{ color: 'var(--danger)', textAlign: 'center' }}>
                    Veuillez d'abord créer un produit avant d'ajouter des commandes.
                  </div>
                ) : (
                  <div className={styles.formGrid}>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label" htmlFor="ordProductId">Produit *</label>
                      <select
                        id="ordProductId"
                        className="form-select"
                        required
                        value={ordProductId}
                        onChange={(e) => handleProductChange(e.target.value)}
                      >
                        <option value="" disabled>-- Choisir un produit --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="ordQty">Quantité *</label>
                      <input id="ordQty" type="number" className="form-input" min="1" required value={ordQty} onChange={(e) => setOrdQty(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="ordPrice">Prix appliqué unitaire (FCFA) *</label>
                      <input id="ordPrice" type="number" className="form-input" required value={ordPrice} onChange={(e) => setOrdPrice(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="ordClientName">Nom du Client *</label>
                      <input id="ordClientName" type="text" className="form-input" required placeholder="ex: Fatou Diop" value={ordClientName} onChange={(e) => setOrdClientName(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="ordClientTel">Téléphone *</label>
                      <input id="ordClientTel" type="tel" className="form-input" required placeholder="ex: 77 123 45 67" value={ordClientTel} onChange={(e) => setOrdClientTel(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="ordClientCity">Ville de Livraison *</label>
                      <select id="ordClientCity" className="form-select" value={ordClientCity} onChange={(e) => setOrdClientCity(e.target.value)}>
                        {CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="ordClientAddress">Adresse précise</label>
                      <input id="ordClientAddress" type="text" className="form-input" placeholder="ex: Liberté 6, en face boulangerie" value={ordClientAddress} onChange={(e) => setOrdClientAddress(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="ordSource">Canal d'acquisition *</label>
                      <select id="ordSource" className="form-select" value={ordSource} onChange={(e) => setOrdSource(e.target.value)}>
                        {CHANNELS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="ordCampaign">Campagne pub</label>
                      <input id="ordCampaign" type="text" className="form-input" placeholder="ex: promo_juin" value={ordCampaign} onChange={(e) => setOrdCampaign(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="ordDateOrder">Date de commande *</label>
                      <input id="ordDateOrder" type="date" className="form-input" required value={ordDateOrder} onChange={(e) => setOrdDateOrder(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="ordStatus">Statut commande</label>
                      <select id="ordStatus" className="form-select" value={ordStatus} onChange={(e) => setOrdStatus(e.target.value)}>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Operational Details on Delivery */}
                    {(ordStatus === 'En livraison' || ordStatus === 'Livree' || ordStatus === 'Retournee') && (
                      <>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <hr style={{ border: '0', borderBottom: '1px solid rgba(255,255,255,0.05)', margin: '8px 0' }} />
                          <label className="form-label" style={{ color: 'var(--accent)' }}>Détails d'expédition & livraison</label>
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="ordCourier">Livreur / Transporteur</label>
                          <input id="ordCourier" type="text" className="form-input" placeholder="ex: Moussa (Livreur Dakar)" value={ordCourier} onChange={(e) => setOrdCourier(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="ordShippingFee">Frais de livraison (FCFA)</label>
                          <input id="ordShippingFee" type="number" className="form-input" value={ordShippingFee} onChange={(e) => setOrdShippingFee(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="ordCollected">Montant réellement encaissé (FCFA)</label>
                          <input id="ordCollected" type="number" className="form-input" placeholder={ordPrice ? (parseInt(ordQty) * parseFloat(ordPrice)).toString() : '0'} value={ordCollected} onChange={(e) => { setOrdCollected(e.target.value); setIsCollectedManuallyEdited(true); }} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="ordDateDelivery">Date de livraison</label>
                          <input id="ordDateDelivery" type="date" className="form-input" value={ordDateDelivery} onChange={(e) => setOrdDateDelivery(e.target.value)} />
                        </div>
                      </>
                    )}

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <hr style={{ border: '0', borderBottom: '1px solid rgba(255,255,255,0.05)', margin: '8px 0' }} />
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className={styles.telConfirm}>
                        <input
                          type="checkbox"
                          className={styles.telConfirmCheckbox}
                          checked={ordConfirmed}
                          onChange={(e) => setOrdConfirmed(e.target.checked)}
                        />
                        <span>Confirmé par téléphone</span>
                      </label>
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label" htmlFor="ordNote">Note interne (raison retour, etc.)</label>
                      <textarea id="ordNote" className="form-textarea" rows={2} placeholder="Saisir des notes ici..." value={ordNote} onChange={(e) => setOrdNote(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={products.length === 0}>Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
