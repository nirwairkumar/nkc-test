import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, CheckCircle, XCircle, DollarSign, Calendar, Globe, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_days: number;
    features: string[];
    is_active: boolean;
}

export default function AdminPricingPanel() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    // Global Premium Unlock State
    const [globalUnlock, setGlobalUnlock] = useState(false);
    const [globalUnlockLoading, setGlobalUnlockLoading] = useState(false);
    const [premiumUsersCount, setPremiumUsersCount] = useState(0);

    // Form State
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Plan>>({
        name: '',
        description: '',
        price: 0,
        duration_days: 30,
        features: [],
        is_active: true
    });
    const [featuresInput, setFeaturesInput] = useState('');

    useEffect(() => {
        fetchPlans();
        fetchGlobalSettings();
        fetchPremiumUsersCount();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        const { fetchPlans } = await import('@/lib/pricingApi');
        const { data, error } = await fetchPlans();

        if (error) {
            toast.error('Failed to fetch plans');
            console.error(error);
        } else {
            setPlans(data || []);
        }
        setLoading(false);
    };

    const fetchGlobalSettings = async () => {
        const { fetchPremiumSettings } = await import('@/lib/pricingApi');
        const { data, error } = await fetchPremiumSettings();

        if (error) {
            console.error('Failed to fetch global settings:', error);
        } else {
            setGlobalUnlock(data?.unlock_all_premium || false);
        }
    };

    const fetchPremiumUsersCount = async () => {
        try {
            const { fetchUsers } = await import('@/lib/usersApi');
            const { data, error } = await fetchUsers();

            if (!error && data) {
                const premiumUsers = data.filter((user: any) => {
                    if (user.is_premium && user.premium_expiry) {
                        const expiry = new Date(user.premium_expiry);
                        return expiry > new Date();
                    }
                    return false;
                });
                setPremiumUsersCount(premiumUsers.length);
            }
        } catch (err) {
            console.error('Error fetching premium users count:', err);
        }
    };

    const handleGlobalUnlockToggle = async (checked: boolean) => {
        const message = checked
            ? 'Are you sure you want to unlock all premium features for everyone? This will allow all users to access premium features without a subscription.'
            : 'Are you sure you want to disable global premium unlock? Users will need active subscriptions to access premium features.';

        if (!confirm(message)) {
            return;
        }

        setGlobalUnlockLoading(true);
        const { updatePremiumSettings } = await import('@/lib/pricingApi');
        const { error } = await updatePremiumSettings(checked);

        if (error) {
            toast.error('Failed to update global unlock setting');
            console.error(error);
        } else {
            setGlobalUnlock(checked);
            toast.success(checked ? 'Premium features unlocked for all users' : 'Premium features locked - subscription required');
        }
        setGlobalUnlockLoading(false);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.price || !formData.duration_days) {
            toast.error("Please fill required fields");
            return;
        }

        const featuresArray = featuresInput.split('\n').filter(f => f.trim() !== '');

        const payload = {
            name: formData.name,
            description: formData.description,
            price: formData.price,
            duration_days: formData.duration_days,
            features: featuresArray,
            is_active: formData.is_active
        };

        const { createPlan, updatePlan } = await import('@/lib/pricingApi');

        try {
            if (isEditing) {
                const { error } = await updatePlan(isEditing, payload);
                if (error) throw error;
                toast.success('Plan updated');
            } else {
                const { error } = await createPlan(payload);
                if (error) throw error;
                toast.success('Plan created');
            }
            fetchPlans();
            resetForm();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this plan?')) return;

        try {
            const { deletePlan } = await import('@/lib/pricingApi');
            const { error } = await deletePlan(id);
            if (error) throw error;
            toast.success('Plan deleted');
            fetchPlans();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleEdit = (plan: Plan) => {
        setIsEditing(plan.id);
        setFormData(plan);
        setFeaturesInput(Array.isArray(plan.features) ? plan.features.join('\n') : '');
    };

    const resetForm = () => {
        setIsEditing(null);
        setFormData({ name: '', description: '', price: 0, duration_days: 30, features: [], is_active: true });
        setFeaturesInput('');
    };

    const formatPrice = (paise: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(paise / 100);
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Manage Pricing Plans</h1>

            {/* Global Premium Access Control */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Globe className="w-6 h-6 text-primary" />
                        <CardTitle className="text-2xl">Global Premium Access Control</CardTitle>
                    </div>
                    <CardDescription>
                        Control premium feature access for all users globally
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Toggle Section */}
                    <div className="flex items-center justify-between p-4 bg-background rounded-lg border-2 border-primary/30">
                        <div className="space-y-1">
                            <Label className="text-lg font-semibold">Unlock All Premium Features</Label>
                            <p className="text-sm text-muted-foreground">
                                {globalUnlock
                                    ? 'All users can access premium features without subscription'
                                    : 'Users need active subscriptions to access premium features'}
                            </p>
                        </div>
                        <Switch
                            checked={globalUnlock}
                            onCheckedChange={handleGlobalUnlockToggle}
                            disabled={globalUnlockLoading}
                            className="data-[state=checked]:bg-green-500"
                        />
                    </div>

                    {/* Warning Message */}
                    {globalUnlock && (
                        <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                                    Global Premium Unlock is Active
                                </p>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    All users currently have access to premium features without requiring a subscription.
                                    This bypasses all payment verification.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-background rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <Label className="text-sm text-muted-foreground">Active Plans</Label>
                            </div>
                            <p className="text-2xl font-bold">
                                {plans.filter(p => p.is_active).length}
                            </p>
                        </div>
                        <div className="p-4 bg-background rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                <Label className="text-sm text-muted-foreground">Premium Users</Label>
                            </div>
                            <p className="text-2xl font-bold">
                                {premiumUsersCount}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Editor Column */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>{isEditing ? 'Edit Plan' : 'Create New Plan'}</CardTitle>
                        <CardDescription>
                            Define the pricing and features. Note: Price is in Paise (e.g. 49900 = ₹499).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Plan Name</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Monthly Pro"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Price (in Paise)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    className="pl-8"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                = {formatPrice(formData.price || 0)}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Duration (Days)</Label>
                            <div className="relative">
                                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    className="pl-8"
                                    value={formData.duration_days}
                                    onChange={e => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Short subtitle"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Features (One per line)</Label>
                            <textarea
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={featuresInput}
                                onChange={e => setFeaturesInput(e.target.value)}
                                placeholder="Unlimited Access&#10;Priority Support"
                            />
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
                                {isEditing ? 'Update Plan' : 'Create Plan'}
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
                <div className="md:col-span-2 space-y-4">
                    {loading ? (
                        <div className="text-center py-10">Loading plans...</div>
                    ) : plans.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                            No plans found. Create one to get started.
                        </div>
                    ) : (
                        plans.map(plan => (
                            <Card key={plan.id} className={!plan.is_active ? 'opacity-60 bg-slate-50' : ''}>
                                <CardContent className="p-6 flex items-start justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-xl">{plan.name}</h3>
                                            {!plan.is_active && <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">Inactive</span>}
                                            {plan.is_active && <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">Active</span>}
                                        </div>
                                        <div className="text-2xl font-bold text-primary">
                                            {formatPrice(plan.price)}
                                            <span className="text-sm font-normal text-muted-foreground ml-1">
                                                / {plan.duration_days} days
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                                        <ul className="text-sm space-y-1 mt-2">
                                            {Array.isArray(plan.features) && plan.features.map((f, i) => (
                                                <li key={i} className="flex items-center gap-2">
                                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button size="icon" variant="outline" onClick={() => handleEdit(plan)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="destructive" onClick={() => handleDelete(plan.id)}>
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
