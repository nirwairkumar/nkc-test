import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
    className?: string;
    label?: string;
    to?: string; // Optional specific destination
}

export function BackButton({ className, label = "Back", to }: BackButtonProps) {
    const navigate = useNavigate();

    const handleBack = () => {
        if (to) {
            navigate(to);
        } else {
            navigate(-1);
        }
    };

    return (
        <Button variant="ghost" size="sm" className={`mb-4 ${className}`} onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {label}
        </Button>
    );
}
