'use client';

import { useEffect, useState, startTransition } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './products.module.css';
import { formatXOF, formatDate } from '@/lib/format';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  prixVenteActuel: number;
  status: string;
  stockActuel: number;
  seuilAlerte: number;
  prixAchat?: number;
  prixTransport?: number;
}

interface SupplierOrder {
  id: string;
  productId: string;
  product: { name: string; sku: string };
  quantity: number;
  costUnit: number;
  currency: string;
  exchangeRate: number;
  transportCustomsFee: number;
  costRevientUnit: number;
  status: string;
  dateOrder: string;
  dateReceive?: string | null;
  supplierName: string;
  supplierLink?: string;
}

interface StockMovement {
  id: string;
  productId: string;
  product: { name: string; sku: string };
  type: string;
  quantity: number;
  notes: string;
  date: string;
}

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'suppliers' | 'flux'>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI filter
  const [search, setSearch] = useState('');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingOrder, setEditingOrder] = useState<SupplierOrder | null>(null);

  // New Product Form State
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodAlert, setProdAlert] = useState('5');
  const [prodStatus, setProdStatus] = useState('actif');
  const [prodStock, setProdStock] = useState('0');
  const [prodPrixAchat, setProdPrixAchat] = useState('0');
  const [prodPrixTransport, setProdPrixTransport] = useState('0');

  // New Supplier Order Form State
  const [ordProductId, setOrdProductId] = useState('');
  const [ordQty, setOrdQty] = useState('');
  const [ordCostUnit, setOrdCostUnit] = useState('');
  const [ordCurrency, setOrdCurrency] = useState('USD');
  const [ordExRate, setOrdExRate] = useState('600'); // default XOF exchange rate for USD
  const [ordFee, setOrdFee] = useState('0');
  const [ordStatus, setOrdStatus] = useState('commande');
  const [ordDateOrder, setOrdDateOrder] = useState(new Date().toISOString().substring(0, 10));
  const [ordDateReceive, setOrdDateReceive] = useState('');
  const [ordSupplier, setOrdSupplier] = useState('');
  const [ordSupplierLink, setOrdSupplierLink] = useState('');

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resProd, resOrd, resMov] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/supplier-orders'),
        fetch('/api/stock-movements'),
      ]);

      if (!resProd.ok || !resOrd.ok || !resMov.ok) {
        throw new Error('Erreur de chargement des données.');
      }

      const dataProd = await resProd.json();
      const dataOrd = await resOrd.json();
      const dataMov = await resMov.json();

      setProducts(dataProd);
      setSupplierOrders(dataOrd);
      setMovements(dataMov);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Catalog
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  // Real-time Estimated Cost calculation
  const calculatedCostRevient = () => {
    const qty = parseInt(ordQty) || 0;
    const cost = parseFloat(ordCostUnit) || 0;
    const rate = parseFloat(ordExRate) || 0;
    const fee = parseFloat(ordFee) || 0;

    if (qty <= 0) return 0;
    return ((cost * qty * rate) + fee) / qty;
  };

  // Product Submit (Create / Update)
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const body: Record<string, any> = {
      name: prodName,
      sku: prodSku,
      category: prodCat,
      prixVenteActuel: parseFloat(prodPrice),
      seuilAlerte: parseInt(prodAlert),
      status: prodStatus,
      prixAchat: parseFloat(prodPrixAchat || '0'),
      prixTransport: parseFloat(prodPrixTransport || '0'),
    };

    // Only send stockActuel when editing (not creating)
    if (editingProduct) {
      body.stockActuel = parseInt(prodStock);
    }

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde du produit.');
      }

      // Close modal & reset fields
      setIsProductModalOpen(false);
      setEditingProduct(null);
      resetProductForm();
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Order Submit (Create / Update)
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const body = {
      productId: ordProductId,
      quantity: parseInt(ordQty),
      costUnit: parseFloat(ordCostUnit),
      currency: ordCurrency,
      exchangeRate: parseFloat(ordExRate),
      transportCustomsFee: parseFloat(ordFee),
      status: ordStatus,
      dateOrder: new Date(ordDateOrder).toISOString(),
      dateReceive: ordDateReceive ? new Date(ordDateReceive).toISOString() : null,
      supplierName: ordSupplier,
      supplierLink: ordSupplierLink,
    };

    try {
      const url = editingOrder ? `/api/supplier-orders/${editingOrder.id}` : '/api/supplier-orders';
      const method = editingOrder ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'enregistrement de l'achat.");
      }

      setIsOrderModalOpen(false);
      setEditingOrder(null);
      resetOrderForm();
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdSku(p.sku);
    setProdCat(p.category || '');
    setProdPrice(p.prixVenteActuel.toString());
    setProdAlert(p.seuilAlerte.toString());
    setProdStatus(p.status);
    setProdStock(p.stockActuel.toString());
    setProdPrixAchat(p.prixAchat ? p.prixAchat.toString() : '0');
    setProdPrixTransport(p.prixTransport ? p.prixTransport.toString() : '0');
    setIsProductModalOpen(true);
  };

  const handleEditOrder = (o: SupplierOrder) => {
    setEditingOrder(o);
    setOrdProductId(o.productId);
    setOrdQty(o.quantity.toString());
    setOrdCostUnit(o.costUnit.toString());
    setOrdCurrency(o.currency);
    setOrdExRate(o.exchangeRate.toString());
    setOrdFee(o.transportCustomsFee.toString());
    setOrdStatus(o.status);
    setOrdDateOrder(o.dateOrder.substring(0, 10));
    setOrdDateReceive(o.dateReceive ? o.dateReceive.substring(0, 10) : '');
    setOrdSupplier(o.supplierName || '');
    setOrdSupplierLink(o.supplierLink || '');
    setIsOrderModalOpen(true);
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet approvisionnement ? Le stock et les dépenses associés seront mis à jour.')) return;
    try {
      const res = await fetch(`/api/supplier-orders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Impossible de supprimer la commande fournisseur.");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetProductForm = () => {
    setProdName('');
    setProdSku('');
    setProdCat('');
    setProdPrice('');
    setProdAlert('5');
    setProdStatus('actif');
    setProdStock('0');
    setProdPrixAchat('0');
    setProdPrixTransport('0');
  };

  const resetOrderForm = () => {
    setOrdProductId('');
    setOrdQty('');
    setOrdCostUnit('');
    setOrdCurrency('USD');
    setOrdExRate('600');
    setOrdFee('0');
    setOrdStatus('commande');
    setOrdDateOrder(new Date().toISOString().substring(0, 10));
    setOrdDateReceive('');
    setOrdSupplier('');
    setOrdSupplierLink('');
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-title">
          <h1>Gestion Produits & Stocks</h1>
          <p>Pilotez votre catalogue, vos alertes et vos réceptions Alibaba</p>
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-secondary" onClick={() => { resetProductForm(); setEditingProduct(null); setIsProductModalOpen(true); }}>
            + Nouveau Produit
          </button>
          <button className="btn btn-primary" onClick={() => { resetOrderForm(); setEditingOrder(null); if (products.length > 0) setOrdProductId(products[0].id); setIsOrderModalOpen(true); }}>
            + Acheter Stock
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'catalog' ? styles.tabActive : ''}`}
          onClick={() => startTransition(() => setActiveTab('catalog'))}
        >
          Catalogue & Stocks
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'suppliers' ? styles.tabActive : ''}`}
          onClick={() => startTransition(() => setActiveTab('suppliers'))}
        >
          Achats Fournisseurs (Alibaba)
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'flux' ? styles.tabActive : ''}`}
          onClick={() => startTransition(() => setActiveTab('flux'))}
        >
          Historique des Flux
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Chargement en cours...</div>
      ) : (
        <>
          {/* TAB 1: CATALOGUE */}
          {activeTab === 'catalog' && (
            <div>
              <div className={styles.searchBar}>
                <input
                  type="text"
                  placeholder="Rechercher par nom, SKU ou catégorie..."
                  className="form-input"
                  style={{ flex: 1 }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>SKU</th>
                      <th>Catégorie</th>
                      <th>Prix de Vente</th>
                      <th>Stock Actuel</th>
                      <th>Statut</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Aucun produit trouvé</td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const isLowStock = p.stockActuel <= p.seuilAlerte;
                        return (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 700 }}>{p.name}</td>
                            <td><code style={{ background: '#1c1c1f', padding: '2px 6px', borderRadius: 4, color: 'var(--accent)' }}>{p.sku}</code></td>
                            <td>{p.category || '-'}</td>
                            <td>{formatXOF(p.prixVenteActuel)}</td>
                            <td>
                              <span className={`badge ${isLowStock ? styles.badgeLowStock : styles.badgeInStock}`}>
                                {p.stockActuel} en stock {isLowStock && `(Alerte ≤ ${p.seuilAlerte})`}
                              </span>
                            </td>
                            <td>
                              <span className={styles.stockStatus}>
                                <span className={`${styles.dot} ${p.status === 'actif' ? styles.dotGreen : styles.dotRed}`}></span>
                                {p.status === 'actif' ? 'Actif' : p.status === 'en_rupture' ? 'Rupture' : 'Archivé'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleEditProduct(p)}>
                                Modifier
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: SUPPLIERS (ALIBABA) */}
          {activeTab === 'suppliers' && (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date Commande</th>
                    <th>Fournisseur</th>
                    <th>Produit</th>
                    <th>Quantité</th>
                    <th>Prix Achat (Devise)</th>
                    <th>Frais Douane / Transp.</th>
                    <th>Coût Revient Unit (XOF)</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Aucun achat enregistré</td>
                    </tr>
                  ) : (
                    supplierOrders.map((o) => (
                      <tr key={o.id}>
                        <td>{formatDate(o.dateOrder)}</td>
                        <td>
                          {o.supplierLink ? (
                            <a href={o.supplierLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                              {o.supplierName || 'Lien Alibaba'}
                            </a>
                          ) : (
                            o.supplierName || '-'
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{o.product?.name}</td>
                        <td>{o.quantity}</td>
                        <td>{o.costUnit} {o.currency} <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>(Taux: {o.exchangeRate})</span></td>
                        <td>{formatXOF(o.transportCustomsFee)}</td>
                        <td style={{ fontWeight: 800, color: 'var(--accent)' }}>{formatXOF(o.costRevientUnit)}</td>
                        <td>
                          <span className={`badge ${
                            o.status === 'dedouane' || o.status === 'recu' ? 'status-success' : o.status === 'en_transit' ? 'status-warning' : 'status-info'
                          }`}>
                            {o.status === 'commande' ? 'Commandé' : o.status === 'en_transit' ? 'En Transit' : o.status === 'recu' ? 'Reçu' : 'Dédouané'}
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
          )}

          {/* TAB 3: FLUX HISTORIQUE */}
          {activeTab === 'flux' && (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date / Heure</th>
                    <th>Produit</th>
                    <th>Type</th>
                    <th>Quantité</th>
                    <th>Description / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Aucun mouvement de stock enregistré</td>
                    </tr>
                  ) : (
                    movements.map((m) => (
                      <tr key={m.id}>
                        <td>{new Date(m.date).toLocaleString('fr-FR')}</td>
                        <td style={{ fontWeight: 600 }}>{m.product?.name}</td>
                        <td>
                          <span className={`badge ${m.type === 'entree' ? 'status-success' : 'status-danger'}`}>
                            {m.type === 'entree' ? '+ Entrée' : '- Sortie'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{m.quantity}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{m.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* MODAL 1: PRODUCT FORM */}
      {isProductModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingProduct ? 'Modifier le Produit' : 'Créer un Produit'}</h2>
              <button className={styles.closeBtn} onClick={() => setIsProductModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleProductSubmit}>
              <div className={styles.modalBody}>
                <div className="form-group">
                  <label className="form-label" htmlFor="prodName">Nom du produit *</label>
                  <input id="prodName" type="text" className="form-input" required value={prodName} onChange={(e) => setProdName(e.target.value)} placeholder="ex: Shampoing Aloe Vera" />
                </div>
                <div className={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="prodSku">SKU / Référence *</label>
                    <input id="prodSku" type="text" className="form-input" required value={prodSku} onChange={(e) => setProdSku(e.target.value)} placeholder="ex: SHAMP-ALOE-01" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="prodCat">Catégorie</label>
                    <input id="prodCat" type="text" className="form-input" value={prodCat} onChange={(e) => setProdCat(e.target.value)} placeholder="ex: Cosmétique" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="prodPrice">Prix de vente public (FCFA) *</label>
                    <input id="prodPrice" type="number" className="form-input" required value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} placeholder="ex: 15000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="prodAlert">Seuil d'alerte de stock *</label>
                    <input id="prodAlert" type="number" className="form-input" required value={prodAlert} onChange={(e) => setProdAlert(e.target.value)} placeholder="ex: 5" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="prodPrixAchat">Prix d'achat unitaire (FCFA)</label>
                    <input id="prodPrixAchat" type="number" className="form-input" value={prodPrixAchat} onChange={(e) => setProdPrixAchat(e.target.value)} placeholder="ex: 3000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="prodPrixTransport">Prix de transport unitaire (FCFA)</label>
                    <input id="prodPrixTransport" type="number" className="form-input" value={prodPrixTransport} onChange={(e) => setProdPrixTransport(e.target.value)} placeholder="ex: 500" />
                  </div>
                </div>
                {editingProduct && (
                  <>
                    <div className={styles.formGrid}>
                      <div className="form-group">
                        <label className="form-label" htmlFor="prodStock">Stock actuel (unités)</label>
                        <input
                          id="prodStock"
                          type="number"
                          min="0"
                          className="form-input"
                          value={prodStock}
                          onChange={(e) => setProdStock(e.target.value)}
                          placeholder="ex: 50"
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                          Un mouvement d'ajustement sera enregistré automatiquement si vous modifiez cette valeur.
                        </span>
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="prodStatus">Statut</label>
                        <select id="prodStatus" className="form-select" value={prodStatus} onChange={(e) => setProdStatus(e.target.value)}>
                          <option value="actif">Actif</option>
                          <option value="en_rupture">En rupture</option>
                          <option value="archive">Archivé</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsProductModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ORDER STOCK FORM (SUPPLIER ORDER) */}
      {isOrderModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingOrder ? "Modifier l'Achat" : "Enregistrer un Achat Fournisseur (Alibaba)"}</h2>
              <button className={styles.closeBtn} onClick={() => setIsOrderModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleOrderSubmit}>
              <div className={styles.modalBody}>
                <div className="form-group">
                  <label className="form-label" htmlFor="ordProductId">Produit acheté *</label>
                  <select id="ordProductId" className="form-select" required value={ordProductId} onChange={(e) => setOrdProductId(e.target.value)}>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ordQty">Quantité *</label>
                    <input id="ordQty" type="number" className="form-input" required value={ordQty} onChange={(e) => setOrdQty(e.target.value)} placeholder="ex: 100" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ordCostUnit">Coût unitaire *</label>
                    <input id="ordCostUnit" type="number" step="0.01" className="form-input" required value={ordCostUnit} onChange={(e) => setOrdCostUnit(e.target.value)} placeholder="ex: 3.5" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ordCurrency">Devise d'achat *</label>
                    <select id="ordCurrency" className="form-select" value={ordCurrency} onChange={(e) => setOrdCurrency(e.target.value)}>
                      <option value="USD">Dollar (USD)</option>
                      <option value="CNY">Yuan (CNY)</option>
                      <option value="XOF">Franc CFA (XOF)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ordExRate">Taux de change (vers XOF) *</label>
                    <input id="ordExRate" type="number" className="form-input" required value={ordExRate} onChange={(e) => setOrdExRate(e.target.value)} placeholder="ex: 600" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ordFee">Transport + Douane total (FCFA)</label>
                    <input id="ordFee" type="number" className="form-input" value={ordFee} onChange={(e) => setOrdFee(e.target.value)} placeholder="ex: 45000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ordStatus">Statut commande</label>
                    <select id="ordStatus" className="form-select" value={ordStatus} onChange={(e) => setOrdStatus(e.target.value)}>
                      <option value="commande">Commandé</option>
                      <option value="en_transit">En Transit</option>
                      <option value="recu">Reçu</option>
                      <option value="dedouane">Dédouané</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ordDateOrder">Date de commande *</label>
                    <input id="ordDateOrder" type="date" className="form-input" required value={ordDateOrder} onChange={(e) => setOrdDateOrder(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ordDateReceive">Date de réception</label>
                    <input id="ordDateReceive" type="date" className="form-input" value={ordDateReceive} onChange={(e) => setOrdDateReceive(e.target.value)} />
                  </div>
                  <div className="form-group " style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="ordSupplier">Fournisseur (Nom Alibaba)</label>
                    <input id="ordSupplier" type="text" className="form-input" value={ordSupplier} onChange={(e) => setOrdSupplier(e.target.value)} placeholder="ex: Yiwu Smart Trading Co." />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="ordSupplierLink">Lien Alibaba</label>
                    <input id="ordSupplierLink" type="url" className="form-input" value={ordSupplierLink} onChange={(e) => setOrdSupplierLink(e.target.value)} placeholder="ex: https://alibaba.com/product..." />
                  </div>
                </div>

                {/* Estimate unit cost of receipt */}
                <div className={styles.costPreview}>
                  <span className={styles.costPreviewLabel}>Prix de revient unitaire estimé :</span>
                  <span className={styles.costPreviewVal}>{formatXOF(calculatedCostRevient())}</span>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsOrderModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
