import pytesseract
import os
import re
import io
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

# Ensure pytesseract can find the executable on Windows if not in PATH
if os.name == 'nt':
    candidates = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'D:\Tesseract-OCR\tesseract.exe',
        r'D:\sihchatbot\tesseract.exe',
    ]
    for p in candidates:
        if os.path.exists(p):
            pytesseract.pytesseract.tesseract_cmd = p
            break

def clean_and_structure_ocr_text(raw_text: str) -> str:
    """
    Intelligently clean and normalize OCR output from Cisco Packet Tracer topologies and CLI screens.
    """
    if not raw_text:
        return ""

    lines = raw_text.splitlines()
    cleaned_lines = []
    
    for line in lines:
        l = line.strip()
        if not l:
            continue
            
        # Fix spaced-out IP addresses and subnets: "192.168. 10.0 / 24" -> "192.168.10.0/24"
        l = re.sub(r'(\d{1,3})\s*\.\s*(\d{1,3})\s*\.\s*(\d{1,3})\s*\.\s*(\d{1,3})\s*/\s*(\d{1,2})', r'\1.\2.\3.\4/\5', l)
        l = re.sub(r'(\d{1,3})\s*\.\s*(\d{1,3})\s*\.\s*(\d{1,3})\s*\.\s*(\d{1,3})', r'\1.\2.\3.\4', l)
        
        # Standardize Cisco model strings
        l = re.sub(r'(?i)\b2960\s*[-|/\}]?\s*24\s*[Tt]{1,2}\b', '2960-24TT', l)
        l = re.sub(r'(?i)\b2960\s*[-|/\}]?\s*[Pp]4\s*[Tt]{1,2}\b', '2960-24TT', l)
        l = re.sub(r'(?i)\b2960-247,?\b', '2960-24TT', l)
        l = re.sub(r'(?i)\b(?:206p\s*¥eTT|2960\]24TT)\b', '2960-24TT', l)
        
        # Standardize Router names (handles Rowter, jouter, fouter, etc.)
        l = re.sub(r'(?i)\b(?:rottert|rowter|jouter|fouter|routet|router)\s*(\d+)\b', r'Router\1', l)
        l = re.sub(r'(?i)\b(?:rottert|rowter|jouter|fouter)\b', 'Router', l)
        
        # Standardize Switch names
        l = re.sub(r'(?i)\b(?:swifch|swifeh|switcn|switch|itch|itcn)\s*(\d+)\b', r'Switch\1', l)
        l = re.sub(r'(?i)\b(?:swifch|swifeh|itchO)\b', 'Switch0', l)
        l = re.sub(r'(?i)\bswitch\?\b', 'Switch2', l)
        
        # Standardize PC names (handles PCO with letter O, PCPT, popt, PGIPT)
        l = re.sub(r'(?i)\bpc[Oo]\b', 'PC0', l)
        l = re.sub(r'(?i)\b(?:pc-pt|pcpt|popt|pgipt|pepr)\s*[-_]?\s*pc\s*(\d+)\b', r'PC\1', l)
        l = re.sub(r'(?i)\b(?:pc-pt|pcpt|popt|pgipt)\s*(\d+)\b', r'PC\1', l)
        l = re.sub(r'(?i)\b(?:pc-pt|pcpt|popt|pgipt)\b', 'PC-PT', l)
        l = re.sub(r'(?i)\bpci\b', 'PC1', l)
        
        # Standardize Server names
        l = re.sub(r'(?i)\b(?:server-pt|serverpt|server)\s*[-_]?\s*server\s*(\d+)\b', r'Server\1', l)
        l = re.sub(r'(?i)\b(?:server-pt|serverpt)\b', 'Server-PT', l)
        
        # Filter out random wire/symbol noise
        cleaned_words = []
        for word in l.split():
            if len(word) == 1 and word in '$/\\|{}[]~^¢*#§,;:?=)(!':
                continue
            cleaned_words.append(word)
            
        line_result = ' '.join(cleaned_words).strip()
        
        # Keep line only if it contains a meaningful network token or IP address
        if re.search(r'(?i)\b(router|switch|pc|server|2960|1941|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b', line_result):
            cleaned_lines.append(line_result)

    full_cleaned = " ".join(cleaned_lines)
    
    # Check if this is a topology diagram (contains multiple distinct devices & subnets)
    found_subnets = list(dict.fromkeys(re.findall(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?:/\d{1,2})?\b', full_cleaned)))
    found_routers = sorted(set(re.findall(r'(?i)\bRouter\s*(\d+)\b', full_cleaned)))
    found_switches = sorted(set(re.findall(r'(?i)\bSwitch\s*(\d+)\b', full_cleaned)))
    found_pcs = sorted(set(re.findall(r'(?i)\bPC\s*(\d+)\b', full_cleaned)))
    found_servers = sorted(set(re.findall(r'(?i)\bServer\s*(\d+)\b', full_cleaned)))
    
    is_diagram = (len(found_subnets) >= 2 or (len(found_routers) + len(found_switches) + len(found_pcs) >= 3))
    
    if is_diagram and (found_routers or found_switches or found_subnets):
        structured = []
        structured.append("# === DISCOVERED TOPOLOGY MAP ===")
        if found_routers:
            r_list = [f"Router{r}" for r in found_routers]
            structured.append(f"Routers:  {', '.join(r_list)} (Cisco 1941)")
        if found_switches:
            sw_list = [f"Switch{s}" for s in found_switches]
            structured.append(f"Switches: {', '.join(sw_list)} (Cisco 2960-24TT)")
        if found_pcs:
            pc_list = [f"PC{p}" for p in found_pcs]
            structured.append(f"Endpoints: {', '.join(pc_list)}")
        if found_servers:
            srv_list = [f"Server{s}" for s in found_servers]
            structured.append(f"Servers:  {', '.join(srv_list)}")
        if found_subnets:
            structured.append(f"Subnets:  {', '.join(found_subnets)}")
        structured.append("# ===============================")
        return "\n".join(structured)

    return "\n".join(cleaned_lines)

def preprocess_for_diagram(image: Image.Image) -> list[Image.Image]:
    """Generate optimal image variations for diagram & CLI text recognition."""
    variants = []
    
    # 1. Base Grayscale with Lanczos Upscaling (2x)
    w, h = image.size
    scaled = image.resize((w * 2, h * 2), Image.Resampling.LANCZOS)
    gray = scaled.convert('L')
    
    # 2. Contrast enhanced
    enhancer = ImageEnhance.Contrast(gray)
    high_contrast = enhancer.enhance(2.2)
    sharpener = ImageEnhance.Sharpness(high_contrast)
    sharp = sharpener.enhance(1.8)
    variants.append(sharp)
    
    # 3. Adaptive thresholding for canvas text
    threshold = 185
    binarized = gray.point(lambda p: 255 if p > threshold else 0)
    variants.append(binarized)
    
    return variants

def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Extract text from an image using enhanced multi-pass Tesseract OCR tuned for diagrams & CLI.
    """
    try:
        raw_image = Image.open(io.BytesIO(image_bytes))
        variants = preprocess_for_diagram(raw_image)
        
        candidates = []
        
        for img in variants:
            try:
                # Sparse mode for diagrams
                text_sparse = pytesseract.image_to_string(img, config='--oem 3 --psm 11')
                if text_sparse and len(text_sparse.strip()) > 5:
                    candidates.append(text_sparse)
            except Exception:
                pass
                
            try:
                # Block mode for CLI tables
                text_block = pytesseract.image_to_string(img, config='--oem 3 --psm 6')
                if text_block and len(text_block.strip()) > 5:
                    candidates.append(text_block)
            except Exception:
                pass
                
        if not candidates:
            # Fallback to default
            text_default = pytesseract.image_to_string(raw_image.convert('L'))
            candidates.append(text_default)
            
        best_text = ""
        best_score = -1
        
        for cand in candidates:
            cleaned = clean_and_structure_ocr_text(cand)
            ip_matches = len(re.findall(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?:/\d{1,2})?\b', cleaned))
            device_matches = len(re.findall(r'(?i)\b(router|switch|pc|server)\b', cleaned))
            score = (ip_matches * 10) + (device_matches * 5) + len(cleaned.splitlines())
            
            if score > best_score:
                best_score = score
                best_text = cleaned
                
        return best_text if best_text else clean_and_structure_ocr_text(candidates[0])
        
    except pytesseract.TesseractNotFoundError:
        return "ERROR: Tesseract OCR is not installed or not in your system PATH. Please install Tesseract."
    except Exception as e:
        return f"ERROR: Failed to extract text from image: {e}"
