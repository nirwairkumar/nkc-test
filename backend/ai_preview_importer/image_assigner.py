from utils.logger import get_logger

logger = get_logger(__name__)

def assign_images_to_questions(questions, images):
    """
    Assigns extracted images to questions based on proximity on the page.
    Modifies questions in-place by adding 'assigned_image'.
    """
    if not questions or not images:
        return questions

    for q in questions:
        q['assigned_image'] = None
        q['option_images'] = {}

        # Filter images on the same page
        page_images = [img for img in images if img['page_num'] == q['page_num']]
        
        # Simple heuristic: Image is assigned to question if it's "close" to the question text
        # For now, just take the nearest image vertically that hasn't been assigned (if we were tracking assignment)
        # Or just assign all images on page to the nearest question?
        # Let's try: Find closest image vertically
        
        closest_img = None
        min_dist = float('inf')
        
        q_y_center = (q['bbox'][1] + q['bbox'][3]) / 2
        
        for img in page_images:
            img_y_center = (img['bbox'][1] + img['bbox'][3]) / 2
            dist = abs(q_y_center - img_y_center)
            
            # Threshold for "close enough" - say 300 units (pixels/pts)
            if dist < 300 and dist < min_dist:
                min_dist = dist
                closest_img = img
        
        if closest_img:
            q['assigned_image'] = closest_img['base64']
            
    logger.info("Assigned images to questions")
    return questions
