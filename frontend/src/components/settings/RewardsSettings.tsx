import React, { useEffect, useState } from 'react';
import { Award, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CurrentGoalWidget } from '@/components/CurrentGoalWidget';
import { fetchCreatorRewards, CreatorRewardsStats } from '@/lib/rewardsApi';
import { CARD } from '@/components/dashboard/dashboardUi';

/** Settings → Rewards. The goal card; the full badges page is /rewards. */
export default function RewardsSettings() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<CreatorRewardsStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        fetchCreatorRewards(user.id).then(({ data }) => {
            if (cancelled) return;
            setStats(data);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [user]);

    return (
        <div className="space-y-3">
            <CurrentGoalWidget stats={stats} loading={loading} />
            <button
                type="button"
                onClick={() => navigate('/rewards')}
                className={`${CARD} flex w-full items-center justify-between px-4 py-3.5 text-[14px] font-semibold text-slate-800 transition-shadow hover:ring-slate-900/[0.12] cursor-pointer`}
            >
                <span className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" /> All badges &amp; conducted tests
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
        </div>
    );
}
