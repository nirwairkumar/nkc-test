import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, CheckCircle, TicketPercent, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PromoCode {
    id: string;
    code: string;
    type: 'flat' | 'percentage';
    value: number;
    max_discount: number | null;
    min_order_value: number;
    max_uses: number | null;
    used_count: number;
    valid_from: string; // ISO String
    valid_till: string | null; // ISO String
    is_active: boolean;
}

export default function AdminPromoCodes() {
    const { isAdmin, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<PromoCode>>({
        code: '',
        type: 'flat',
        value: 0,
        max_discount: null,
        min_order_value: 0,
        max_uses: null,
        valid_from: new Date().toISOString().split('T')[0], // Today YYYY-MM-DD
        valid_till: null,
        is_active: true
    });

    useEffect(() => {
        if (!authLoading) {
            if (!isAdmin) {
                navigate('/admin-login');
            } else {
                fetchPromos();
            }
        }
    }, [authLoading, isAdmin, navigate]);

    const fetchPromos = async () => {
        setLoading(true);
        const { fetchPromos } = await import('@/lib/pricingApi');
        const { data, error } = await fetchPromos();

        if (error) {
            toast.error('Failed to fetch promo codes');
            console.error(error);
        } else {
            setPromos(data || []);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!formData.code || !formData.value || !formData.type || !formData.valid_from) {
            toast.error("Please fill required fields (Code, Value, Type, Valid From)");
            return;
        }

        const payload = {
            code: formData.code.toUpperCase(),
            type: formData.type,
            value: Number(formData.value),
            max_discount: formData.max_discount ? Number(formData.max_discount) : null,
            min_order_value: Number(formData.min_order_value) || 0,
            max_uses: formData.max_uses ? Number(formData.max_uses) : null,
            valid_from: new Date(formData.valid_from!).toISOString(),
            valid_till: formData.valid_till ? new Date(formData.valid_till).toISOString() : null,
            is_active: formData.is_active
        };

        const { createPromo, updatePromo } = await import('@/lib/pricingApi');

        try {
            if (isEditing) {
                const { error } = await updatePromo(isEditing, payload);
                if (error) throw error;
                toast.success('Promo Code updated');
            } else {
                const { error } = await createPromo(payload);
                if (error) throw error;
                toast.success('Promo Code created');
            }
            fetchPromos();
            resetForm();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this promo code? This action cannot be undone if it has history.')) return;

        try {
            const { deletePromo } = await import('@/lib/pricingApi');
            const { error } = await deletePromo(id);
            if (error) throw error;
            toast.success('Promo Code deleted');
            fetchPromos();
        } catch (error: any) {
            toast.error('Could not delete: ' + error.message);
        }
    };

    const handleEdit = (promo: PromoCode) => {
        setIsEditing(promo.id);
        setFormData({
            ...promo,
            valid_from: promo.valid_from ? promo.valid_from.split('T')[0] : '',
            valid_till: promo.valid_till ? promo.valid_till.split('T')[0] : '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setIsEditing(null);
        setFormData({
            code: '',
            type: 'flat',
            value: 0,
            max_discount: null,
            min_order_value: 0,
            max_uses: null,
            valid_from: new Date().toISOString().split('T')[0],
            valid_till: null,
            is_active: true
        });
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val / 100);
    }

    if (authLoading) return <div className="p-10 text-center">Checking permissions...</div>;
    if (!isAdmin) return null;

    return (
        <div className="container mx-auto max-w-6xl py-10 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Manage Promo Codes</h1>
                <Button variant="outline" onClick={() => navigate('/admin-pricing')}>Back to Pricing</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Editor Column */}
                <Card className="lg:col-span-1 h-fit sticky top-4">
                    <CardHeader>
                        <CardTitle>{isEditing ? 'Edit Promo Code' : 'Create New Promo'}</CardTitle>
                        <CardDescription>
                            Configure discount rules and limits.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Code (Uppercase)</Label>
                            <Input
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="e.g. SUMMER50"
                                className="uppercase font-mono"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val: 'flat' | 'percentage') => setFormData({ ...formData, type: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Value {formData.type === 'flat' ? '(Paise)' : '(%)'}</Label>
                                <Input
                                    type="number"
                                    value={formData.value}
                                    onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                                />
                                {formData.type === 'flat' && (
                                    <p className="text-xs text-muted-foreground">{formatCurrency(Number(formData.value || 0))}</p>
                                )}
                            </div>
                        </div>

                        {formData.type === 'percentage' && (
                            <div className="space-y-2">
                                <Label>Max Discount Cap (Paise) - Optional</Label>
                                <Input
                                    type="number"
                                    value={formData.max_discount || ''}
                                    onChange={e => setFormData({ ...formData, max_discount: Number(e.target.value) })}
                                    placeholder="No Cap"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Min Order Value (Paise)</Label>
                            <Input
                                type="number"
                                value={formData.min_order_value}
                                onChange={e => setFormData({ ...formData, min_order_value: Number(e.target.value) })}
                            />
                            <p className="text-xs text-muted-foreground">{formatCurrency(Number(formData.min_order_value || 0))}</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Max Uses (Total) - Optional</Label>
                            <Input
                                type="number"
                                value={formData.max_uses || ''}
                                onChange={e => setFormData({ ...formData, max_uses: Number(e.target.value) })}
                                placeholder="Unlimited"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Valid From</Label>
                                <Input
                                    type="date"
                                    value={formData.valid_from}
                                    onChange={e => setFormData({ ...formData, valid_from: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Valid Till (Optional)</Label>
                                <Input
                                    type="date"
                                    value={formData.valid_till || ''}
                                    onChange={e => setFormData({ ...formData, valid_till: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between border p-3 rounded-md">
                            <Label>Active Status</Label>
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={c => setFormData({ ...formData, is_active: c })}
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button className="flex-1" onClick={handleSave}>
                                {isEditing ? <CheckCircle className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                {isEditing ? 'Update Promo' : 'Create Promo'}
                            </Button>
                            {isEditing && (
                                <Button variant="outline" onClick={resetForm}>
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* List Column */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="text-center py-10">Loading promos...</div>
                    ) : promos.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                            No promo codes found.
                        </div>
                    ) : (
                        promos.map(promo => (
                            <Card key={promo.id} className={!promo.is_active ? 'opacity-60 bg-slate-50' : ''}>
                                <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-xl font-mono">{promo.code}</h3>
                                            {!promo.is_active && <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">Inactive</span>}
                                            {promo.is_active && <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">Active</span>}
                                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">Used: {promo.used_count} {promo.max_uses ? `/ ${promo.max_uses}` : ''}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <TicketPercent className="w-4 h-4" />
                                                {promo.type === 'flat' ? `Flat ${formatCurrency(promo.value)}` : `${promo.value}% Off`}
                                                {promo.max_discount ? ` (Max ${formatCurrency(promo.max_discount)})` : ''}
                                            </div>
                                            {promo.valid_till && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    Expires: {new Date(promo.valid_till).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                        {promo.min_order_value > 0 && (
                                            <p className="text-xs text-muted-foreground">Min Order: {formatCurrency(promo.min_order_value)}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="icon" variant="outline" onClick={() => handleEdit(promo)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="destructive" onClick={() => handleDelete(promo.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
