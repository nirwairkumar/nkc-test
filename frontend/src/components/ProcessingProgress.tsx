import React from 'react';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  Upload, 
  Scan, 
  FileSearch, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Image,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProcessingProgressProps {
  stage: 'uploading' | 'analyzing' | 'processing' | 'extracting' | 'finalizing' | 'complete' | 'error';
  percent: number;
  message: string;
  data?: {
    batch?: number;
    total_batches?: number;
    questions_found?: number;
    quality_tier?: 'high' | 'medium' | 'low';
    dpi?: number;
    warning?: boolean;
  };
  className?: string;
}

const stageConfig = {
  uploading: {
    icon: Upload,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    label: 'Uploading'
  },
  analyzing: {
    icon: Scan,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
    label: 'Analyzing'
  },
  processing: {
    icon: Layers,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    label: 'Processing'
  },
  extracting: {
    icon: FileSearch,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
    label: 'Extracting'
  },
  finalizing: {
    icon: Loader2,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500',
    label: 'Finalizing'
  },
  complete: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    label: 'Complete'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    label: 'Error'
  }
};

const qualityLabels = {
  high: { text: 'High Quality', color: 'bg-green-100 text-green-800' },
  medium: { text: 'Medium Quality', color: 'bg-yellow-100 text-yellow-800' },
  low: { text: 'Low Quality', color: 'bg-orange-100 text-orange-800' }
};

export function ProcessingProgress({ 
  stage, 
  percent, 
  message, 
  data,
  className 
}: ProcessingProgressProps) {
  const config = stageConfig[stage];
  const Icon = config.icon;
  
  return (
    <div className={cn(
      "w-full max-w-3xl mx-auto p-6 bg-card border rounded-xl shadow-lg",
      className
    )}>
      {/* Header with icon and status */}
      <div className="flex items-center gap-4 mb-6">
        <div className={cn(
          "p-3 rounded-xl transition-all duration-300",
          "bg-muted",
          config.color
        )}>
          <Icon className={cn(
            "w-7 h-7",
            stage === 'finalizing' && "animate-spin"
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-lg truncate">
              {message}
            </h3>
            
            {/* ULTRA-FAST badge */}
            {stage !== 'complete' && stage !== 'error' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                <Zap className="w-3 h-3 mr-1" />
                Ultra-Fast
              </span>
            )}
          </div>
          
          {/* Metadata badges */}
          {data && (
            <div className="flex flex-wrap gap-2 mt-2">
              {data.quality_tier && (
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                  qualityLabels[data.quality_tier].color
                )}>
                  <Image className="w-3 h-3 mr-1" />
                  {qualityLabels[data.quality_tier].text}
                </span>
              )}
              
              {data.dpi && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary">
                  {data.dpi} DPI
                </span>
              )}
              
              {data.batch !== undefined && data.total_batches && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary">
                  Batch {data.batch} / {data.total_batches}
                </span>
              )}
              
              {data.questions_found !== undefined && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  {data.questions_found} questions
                </span>
              )}
              
              {data.warning && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Warning
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="space-y-2">
        <Progress 
          value={percent} 
          className={cn(
            "h-3",
            stage === 'error' && "bg-red-200",
            stage === 'complete' && "bg-green-200"
          )}
        />
        
        <div className="flex justify-between text-sm text-muted-foreground items-center">
          <span className="flex items-center gap-2">
            {stage === 'complete' 
              ? 'Processing complete!' 
              : stage === 'error'
              ? 'Processing failed'
              : (
                <>
                  Processing
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </>
              )}
          </span>
          <span className="font-medium">{percent}%</span>
        </div>
      </div>
      
      {/* Batch progress visualization */}
      {data?.total_batches && data.total_batches > 1 && stage === 'processing' && (
        <div className="mt-4">
          <div className="flex gap-1">
            {Array.from({ length: data.total_batches }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-2 rounded-full transition-all duration-500",
                  i < (data.batch || 0) 
                    ? 'bg-primary' 
                    : i === (data.batch || 0) - 1
                    ? 'bg-primary/50 animate-pulse'
                    : 'bg-muted'
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Parallel batch processing active
          </p>
        </div>
      )}
      
      {/* Time estimate hint */}
      {stage !== 'complete' && stage !== 'error' && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Questions will appear below as they're extracted
        </p>
      )}
    </div>
  );
}

export default ProcessingProgress;
