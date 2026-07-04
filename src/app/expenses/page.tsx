'use client';

import { useEffect, useState, startTransition } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './expenses.module.css';
import { formatXOF, formatDate } from '@/lib/format';

interface Expense {
  id: string;
  category: string;
  subcategory: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  amountXof: number;
  date: string;
  description?: string;
  receiptUrl?: string;
  createdBy?: { name: string } | null;
  createdAt: string;
}

const CATEGORIES = [
  'Achat marchandise',
  'Publicité',
  'Livraison',
  'Autres frais'
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form State
  const [expCategory, setExpCategory] = useState('Publicité');
  const [expSubcategory, setExpSubcategory] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCurrency, setExpCurrency] = useState('XOF');
  const [expExRate, setExpExRate] = useState('1');
  const [expDate, setExpDate] = useState(new Date().toISOString().substring(0, 10));
  const [expDesc, setExpDesc] = useState('');
  const [expReceipt, setExpReceipt] = useState('');
  const [fileName, setFileName] = useState('');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterCategory) query.append('category', filterCategory);
      if (filterStartDate) query.append('startDate', filterStartDate);
      if (filterEndDate) query.append('endDate', filterEndDate);

      const res = await fetch(`/api/expenses?${query.toString()}`);
      if (!res.ok) throw new Error('Impossible de charger les dépenses.');
      const data = await res.json();
      setExpenses(data);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [filterCategory, filterStartDate, filterEndDate]);

  // Handle Currency change to auto-fill default rates
  const handleCurrencyChange = (curr: string) => {
    setExpCurrency(curr);
    if (curr === 'USD') setExpExRate('600');
    else if (curr === 'CNY') setExpExRate('83');
    else setExpExRate('1');
  };

  // Submit Expense Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const body = {
      category: expCategory,
      subcategory: expSubcategory,
      amount: parseFloat(expAmount),
      currency: expCurrency,
      exchangeRate: parseFloat(expExRate),
      date: new Date(expDate).toISOString(),
      description: expDesc,
      receiptUrl: expReceipt,
    };

    try {
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses';
      const method = editingExpense ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde de la dépense.');
      }

      setIsModalOpen(false);
      setEditingExpense(null);
      resetForm();
      fetchExpenses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpCategory(exp.category);
    setExpSubcategory(exp.subcategory || '');
    setExpAmount(exp.amount.toString());
    setExpCurrency(exp.currency);
    setExpExRate(exp.exchangeRate.toString());
    setExpDate(exp.date.substring(0, 10));
    setExpDesc(exp.description || '');
    setExpReceipt(exp.receiptUrl || '');
    setFileName(exp.receiptUrl ? 'Justificatif existant' : '');
    setIsModalOpen(true);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette dépense ?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Impossible de supprimer la dépense.');
      fetchExpenses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMockFileUpload = () => {
    // Simulating file upload
    const mockFileName = `reçu_${Date.now().toString().slice(-6)}.pdf`;
    setFileName(mockFileName);
    setExpReceipt(`/uploads/${mockFileName}`);
  };

  const resetForm = () => {
    setExpCategory('Publicité');
    setExpSubcategory('');
    setExpAmount('');
    setExpCurrency('XOF');
    setExpExRate('1');
    setExpDate(new Date().toISOString().substring(0, 10));
    setExpDesc('');
    setExpReceipt('');
    setFileName('');
  };

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amountXof, 0);
  const totalMerc = expenses.filter(e => e.category === 'Achat marchandise').reduce((sum, e) => sum + e.amountXof, 0);
  const totalPub = expenses.filter(e => e.category === 'Publicité').reduce((sum, e) => sum + e.amountXof, 0);
  const totalLiv = expenses.filter(e => e.category === 'Livraison').reduce((sum, e) => sum + e.amountXof, 0);
  const totalOther = expenses.filter(e => e.category === 'Autres frais').reduce((sum, e) => sum + e.amountXof, 0);

  // Calculated Converted Price in modal
  const getConvertedPrice = () => {
    const amt = parseFloat(expAmount) || 0;
    const rate = parseFloat(expExRate) || 0;
    return amt * rate;
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-title">
          <h1>Suivi des Dépenses</h1>
          <p>Enregistrez et catégorisez toutes les sorties financières de votre activité</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setEditingExpense(null);
            setIsModalOpen(true);
          }}
        >
          + Enregistrer une Dépense
        </button>
      </div>

      {/* Metrics Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Dépenses Totales</span>
          <span className={`${styles.metricValue} ${styles.metricValueYellow}`}>{formatXOF(totalExpenses)}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Marchandises</span>
          <span className={styles.metricValue}>{formatXOF(totalMerc)}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Publicité</span>
          <span className={styles.metricValue}>{formatXOF(totalPub)}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Livraison (Global)</span>
          <span className={styles.metricValue}>{formatXOF(totalLiv)}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Autres frais</span>
          <span className={styles.metricValue}>{formatXOF(totalOther)}</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Catégorie</label>
          <select className="form-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map((c) => (
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
        <button className="btn btn-secondary" style={{ height: '38px' }} onClick={fetchExpenses}>
          Actualiser
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Chargement en cours...</div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Catégorie</th>
                <th>Sous-Catégorie</th>
                <th>Montant Saisi</th>
                <th>Montant (FCFA)</th>
                <th>Description</th>
                <th>Justificatif</th>
                <th>Saisi par</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Aucune dépense trouvée</td>
                </tr>
              ) : (
                expenses.map((e) => {
                  const isLinkedToStock = e.description?.startsWith('Achat marchandise - Réf Commande:');
                  return (
                    <tr key={e.id}>
                      <td>{formatDate(e.date)}</td>
                      <td style={{ fontWeight: 700 }}>{e.category}</td>
                      <td>
                        <code style={{ background: '#1c1c1f', padding: '2px 6px', borderRadius: 4, color: 'var(--accent)' }}>
                          {e.subcategory || '-'}
                        </code>
                      </td>
                      <td>{e.amount} {e.currency} {e.currency !== 'XOF' && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>(Taux: {e.exchangeRate})</span>}</td>
                      <td style={{ fontWeight: 800, color: 'var(--accent)' }}>{formatXOF(e.amountXof)}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.description || '-'}
                      </td>
                      <td>
                        {e.receiptUrl ? (
                          <span className={styles.receiptBadge} onClick={() => alert(`Téléchargement fictif du fichier: ${e.receiptUrl}`)}>
                            facture.pdf
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.createdBy?.name || 'Système'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {!isLinkedToStock ? (
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => handleEditExpense(e)}>
                              Éditer
                            </button>
                            <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12, borderColor: 'rgba(239,68,68,0.2)', color: 'var(--danger)' }} onClick={() => handleDeleteExpense(e.id)}>
                              Suppr.
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Liaison Stock (Alibaba)</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* EXPENSE DIALOG / MODAL */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingExpense ? 'Modifier la Dépense' : 'Enregistrer une Dépense'}</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className="form-group">
                  <label className="form-label" htmlFor="expCategory">Catégorie *</label>
                  <select
                    id="expCategory"
                    className="form-select"
                    required
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    disabled={expCategory === 'Achat marchandise'} // Locked because merch order is generated from supplier order
                  >
                    {/* Filter out merch purchase for direct input, to avoid breaking stock linkage */}
                    <option value="Publicité">Publicité</option>
                    <option value="Livraison">Livraison (Frais globaux)</option>
                    <option value="Autres frais">Autres frais (Salaires, Loyers, Abonnements, etc.)</option>
                    {editingExpense?.category === 'Achat marchandise' && (
                      <option value="Achat marchandise">Achat marchandise (Lié à Alibaba)</option>
                    )}
                  </select>
                </div>

                <div className={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="expSubcategory">Sous-catégorie / Plateforme</label>
                    <input
                      id="expSubcategory"
                      type="text"
                      className="form-input"
                      placeholder="ex: TikTok Ads, Loyer Dakar, Shopify"
                      value={expSubcategory}
                      onChange={(e) => setExpSubcategory(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="expDate">Date *</label>
                    <input id="expDate" type="date" className="form-input" required value={expDate} onChange={(e) => setExpDate(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="expAmount">Montant *</label>
                    <input id="expAmount" type="number" step="0.01" className="form-input" required placeholder="ex: 150" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="expCurrency">Devise *</label>
                    <select id="expCurrency" className="form-select" value={expCurrency} onChange={(e) => handleCurrencyChange(e.target.value)}>
                      <option value="XOF">Franc CFA (XOF)</option>
                      <option value="USD">Dollar (USD)</option>
                      <option value="CNY">Yuan (CNY)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="expExRate">Taux de change (vers XOF)</label>
                    <input id="expExRate" type="number" className="form-input" value={expExRate} onChange={(e) => setExpExRate(e.target.value)} />
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div className={styles.fileUploadContainer} onClick={handleMockFileUpload}>
                      <div className={styles.fileUploadText}>
                        {fileName ? (
                          <span>✓ {fileName}</span>
                        ) : (
                          <>Ajouter un <span>justificatif</span> (Facture/Reçu)</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time XOF Conversion Preview */}
                <div className={styles.amountPreview}>
                  <span className={styles.amountPreviewLabel}>Montant converti en Franc CFA :</span>
                  <span className={styles.amountPreviewVal}>{formatXOF(getConvertedPrice())}</span>
                </div>

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label" htmlFor="expDesc">Description libre</label>
                  <textarea id="expDesc" className="form-textarea" rows={3} placeholder="ex: Campagne pub TikTok Shampoing Aloe lot Juin" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
