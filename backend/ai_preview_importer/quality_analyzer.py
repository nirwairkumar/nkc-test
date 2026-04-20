"""
Quality Analyzer Module - Analyzes image quality to determine optimal processing parameters
"""
import io
from typing import Dict
from utils.logger import get_logger
# cv2, numpy, PIL are lazily imported inside methods to avoid loading ~120MB at startup

logger = get_logger(__name__)


class QualityAnalyzer:
    """Analyzes image quality to determine optimal processing parameters"""
    
    @staticmethod
    def analyze_page(image_bytes: bytes) -> Dict:
        """
        Analyze single page quality and return processing parameters
        
        Returns:
            Dict with keys:
                - score: float (0-1 overall quality score)
                - tier: str ('high', 'medium', 'low')
                - dpi: int (150, 200, or 300)
                - metrics: Dict (detailed metric scores)
                - recommendation: str (user-facing message)
        """
        import cv2           # lazy-loaded: only used by OCR pipeline
        import numpy as np  # lazy-loaded: only used by OCR pipeline
        from PIL import Image  # lazy-loaded: only used by OCR pipeline
        try:
            # Convert to PIL Image
            img = Image.open(io.BytesIO(image_bytes))
            img_array = np.array(img)
            
            # Convert to grayscale if needed
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array
            
            # Calculate metrics
            metrics = {
                'sharpness': QualityAnalyzer._calculate_sharpness(gray),
                'contrast': QualityAnalyzer._calculate_contrast(gray),
                'brightness': QualityAnalyzer._calculate_brightness(gray),
                'noise': QualityAnalyzer._calculate_noise(gray)
            }
            
            # Calculate overall quality score (0-1)
            score = QualityAnalyzer._calculate_quality_score(metrics)
            
            # Determine tier and DPI
            if score >= 0.8:
                tier = 'high'
                dpi = 150
            elif score >= 0.5:
                tier = 'medium'
                dpi = 200
            else:
                tier = 'low'
                dpi = 300
            
            result = {
                'score': score,
                'tier': tier,
                'dpi': dpi,
                'metrics': metrics,
                'recommendation': QualityAnalyzer._get_recommendation(score)
            }
            
            logger.info(f"Quality analysis: {tier} tier (score: {score:.2f}, DPI: {dpi})")
            return result
            
        except Exception as e:
            logger.error(f"Quality analysis failed: {e}")
            # Default to medium quality if analysis fails
            return {
                'score': 0.5,
                'tier': 'medium',
                'dpi': 200,
                'metrics': {},
                'recommendation': 'Default settings applied'
            }
    
    @staticmethod
    def _calculate_sharpness(gray) -> float:
        """Calculate image sharpness using Laplacian variance"""
        import cv2
        import numpy as np
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = laplacian.var()
        # Normalize: good sharpness typically > 100
        # Scale so that 500 = 1.0 (excellent sharpness)
        return min(variance / 500, 1.0)
    
    @staticmethod
    def _calculate_contrast(gray) -> float:
        """Calculate contrast ratio"""
        import numpy as np
        min_val = np.min(gray)
        max_val = np.max(gray)
        contrast = (max_val - min_val) / 255.0
        return contrast
    
    @staticmethod
    def _calculate_brightness(gray) -> float:
        """Calculate average brightness"""
        import numpy as np
        return np.mean(gray) / 255.0
    
    @staticmethod
    def _calculate_noise(gray) -> float:
        """Estimate noise level using median filter difference"""
        import cv2
        import numpy as np
        # Use median filter to denoise and compare
        denoised = cv2.medianBlur(gray, 5)
        noise = np.mean(np.abs(gray.astype(float) - denoised.astype(float)))
        # Normalize: lower is better
        # Typical noise levels: 5-10 (low), 20-30 (medium), 50+ (high)
        return 1.0 - min(noise / 50, 1.0)
    
    @staticmethod
    def _calculate_quality_score(metrics: Dict) -> float:
        """Calculate overall quality score from metrics with weighted average"""
        weights = {
            'sharpness': 0.4,
            'contrast': 0.3,
            'noise': 0.2,
            'brightness': 0.1
        }
        
        score = 0.0
        total_weight = 0.0
        
        for metric, weight in weights.items():
            if metric in metrics:
                score += metrics[metric] * weight
                total_weight += weight
        
        # Normalize if some metrics are missing
        if total_weight > 0:
            score = score / total_weight
        
        return score
    
    @staticmethod
    def _get_recommendation(score: float) -> str:
        """Get user-facing recommendation based on quality score"""
        if score >= 0.8:
            return "Excellent quality - processing at 150 DPI for maximum speed"
        elif score >= 0.6:
            return "Good quality - processing at 200 DPI for balanced speed and accuracy"
        elif score >= 0.4:
            return "Fair quality - processing at 300 DPI for better accuracy"
        elif score >= 0.3:
            return "Low quality detected - processing at 300 DPI. Results may be less accurate"
        else:
            return "Warning: Very low quality detected. Please upload a clearer image for best results"
    
    @staticmethod
    def check_minimum_quality(score: float) -> tuple[bool, str]:
        """
        Check if quality meets minimum threshold
        
        Returns:
            tuple: (is_acceptable, message)
        """
        if score < 0.3:
            return False, (
                "Image quality is too low for reliable extraction. "
                "Please upload a clearer image with better resolution and lighting. "
                "Tips: Use a scanner instead of camera, ensure good lighting, "
                "and avoid blurry or dark photos."
            )
        elif score < 0.5:
            return True, (
                "Low quality image detected. Processing at maximum DPI for best results. "
                "Consider uploading a clearer image if extraction is inaccurate."
            )
        else:
            return True, None
