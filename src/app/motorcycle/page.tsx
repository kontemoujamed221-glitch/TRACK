'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { formatXOF, formatDate } from '@/lib/format';
import { useToast } from '@/components/Toast';

interface MotorcycleRevenue {
  id: string;
  date: string;
  amount: number;
  driverName?: string;
  notes?: string;
  createdBy?: { id?: string; name: string; role?: string } | null;
  createdAt: string;
}

interface SummaryData {
  totalCumulative: number;
  totalDaysCount: number;
  averagePerDay: number;
  currentMonthRevenue: number;
}

export default function MotorcyclePage() {
  const { toast } = useToast();
  const [revenues, setRevenues] = useState<MotorcycleRevenue[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalCumulative: 0,
    totalDaysCount: 0,
    averagePerDay: 0,
    currentMonthRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<MotorcycleRevenue | null>(null);

  // Form State
  const [revDate, setRevDate] = useState(new Date().toISOString().substring(0, 10));
  const [revAmount, setRevAmount] = useState('');

  const fetchRevenues = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterStartDate) query.append('startDate', filterStartDate);
      if (filterEndDate) query.append('endDate', filterEndDate);

      const res = await fetch(`/api/motorcycle-revenue?${query.toString()}`);
      if (!res.ok) throw new Error('Impossible de charger les recettes de la moto.');
      const data = await res.json();
      setRevenues(data.revenues || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenues();
  }, [filterStartDate, filterEndDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!revAmount || isNaN(parseFloat(revAmount))) {
      toast.error('Veuillez saisir un montant valide.');
      return;
    }

    const body = {
      amount: parseFloat(revAmount),
      date: new Date(revDate).toISOString(),
    };

    try {
      const url = editingRevenue ? `/api/motorcycle-revenue/${editingRevenue.id}` : '/api/motorcycle-revenue';
      const method = editingRevenue ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde de la recette.');
      }

      setIsModalOpen(false);
      const isEdit = !!editingRevenue;
      setEditingRevenue(null);
      resetForm();
      fetchRevenues();
      toast.success(isEdit ? 'Recette moto modifiée avec succès.' : 'Votre recette moto a été enregistrée avec succès.');
    } catch (err: any) {
      toast.error(err.message || 'Une erreur est survenue.');
    }
  };

  const handleEdit = (rev: MotorcycleRevenue) => {
    setEditingRevenue(rev);
    setRevDate(rev.date.substring(0, 10));
    setRevAmount(rev.amount.toString());
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette entrée de recette moto ?')) return;
    try {
      const res = await fetch(`/api/motorcycle-revenue/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Impossible de supprimer la recette.');
      fetchRevenues();
      toast.success('Recette moto supprimée.');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression.');
    }
  };

  const resetForm = () => {
    setRevDate(new Date().toISOString().substring(0, 10));
    setRevAmount('');
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-title">
          <h1>Suivi & Recettes de la Moto</h1>
          <p>Journal de bord des revenus générés quotidiennement par votre moto de livraison</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setEditingRevenue(null);
            setIsModalOpen(true);
          }}
        >
          + Saisir Recette Journée (Moto)
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Cumulé Généré
          </span>
          <span style={{ display: 'block', fontSize: 26, fontWeight: 900, color: 'var(--accent)', marginTop: 6 }}>
            {formatXOF(summary.totalCumulative)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
            Somme globale cumulée de la moto
          </span>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Moyenne par Jour
          </span>
          <span style={{ display: 'block', fontSize: 26, fontWeight: 900, color: '#10b981', marginTop: 6 }}>
            {formatXOF(Math.round(summary.averagePerDay))}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
            Rendement moyen journalier
          </span>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recette Ce Mois-ci
          </span>
          <span style={{ display: 'block', fontSize: 26, fontWeight: 900, color: '#3b82f6', marginTop: 6 }}>
            {formatXOF(summary.currentMonthRevenue)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
            Cumul des journées du mois en cours
          </span>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Jours Enregistrés
          </span>
          <span style={{ display: 'block', fontSize: 26, fontWeight: 900, color: 'var(--foreground)', marginTop: 6 }}>
            {summary.totalDaysCount} jour{summary.totalDaysCount > 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
            Entrées journalières comptabilisées
          </span>
        </div>
      </div>

      {/* Date Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Du :</label>
          <input type="date" className="form-input" style={{ width: 150 }} value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Au :</label>
          <input type="date" className="form-input" style={{ width: 150 }} value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
        </div>
        {(filterStartDate || filterEndDate) && (
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={() => {
              setFilterStartDate('');
              setFilterEndDate('');
            }}
          >
            Réinitialiser filtres
          </button>
        )}
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Chargement des recettes...</div>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div className="table-container" style={{ display: 'block' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Montant Généré</th>
                  <th>Saisie par</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {revenues.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 30 }}>
                      Aucune recette moto enregistrée pour cette période.
                    </td>
                  </tr>
                ) : (
                  revenues.map((rev) => (
                    <tr key={rev.id}>
                      <td style={{ fontWeight: 700 }}>{formatDate(rev.date)}</td>
                      <td style={{ fontWeight: 800, color: '#10b981', fontSize: 15 }}>{formatXOF(rev.amount)}</td>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(250, 204, 21, 0.08)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(250, 204, 21, 0.15)' }}>
                          <span>👤</span>
                          <span>{rev.createdBy?.name || 'Inconnu'}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => handleEdit(rev)}>
                            Éditer
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12, borderColor: 'rgba(239,68,68,0.2)', color: 'var(--danger)' }} onClick={() => handleDelete(rev.id)}>
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
        </>
      )}

      {/* FORM MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>
                {editingRevenue ? 'Modifier la Recette Moto' : 'Saisir une Recette Moto (Jour)'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 20 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={revDate}
                  onChange={(e) => setRevDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Montant Généré (FCFA) *</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  className="form-input"
                  placeholder="ex: 15000"
                  required
                  value={revAmount}
                  onChange={(e) => setRevAmount(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRevenue ? 'Enregistrer les modifications' : 'Enregistrer la Recette'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
