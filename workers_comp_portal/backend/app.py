from flask import Flask, jsonify, request, send_file, Response
from flask_cors import CORS
import os
import sys
import json
from pathlib import Path
# Add to your imports at the top
from flask import Flask, jsonify, request, render_template
import datetime

# Add the path to your existing code
sys.path.append(r'C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Intake AI Agent\referrals')

# Import your existing modules
from process import process_order_folder, format_llm_request, save_results
from llm_client import call_llm_api
from extract import initialize_documentai
from provider_mapping_simple import find_nearest_providers, test_database_connection

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure paths
INPUT_DIR = Path(r'C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Intake AI Agent\data\orders')
OUTPUT_DIR = Path(r'C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Intake AI Agent\data\results')
OCR_DIR = Path(r'C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Intake AI Agent\data\ocr')


# Then change your app to serve the template at the root route:
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/orders', methods=['GET'])
def get_orders():
    """Get all orders"""
    try:
        orders = []
        for folder in INPUT_DIR.glob("*"):
            if folder.is_dir():
                order_id = folder.name
                result_path = OUTPUT_DIR / f"{order_id}_results.json"
                status = "Processed" if result_path.exists() else "Pending"
                
                order_info = {
                    "order_id": order_id,
                    "status": status,
                    "processed_date": None
                }
                
                if result_path.exists():
                    try:
                        with open(result_path, 'r', encoding='utf-8') as f:
                            result = json.load(f)
                            # Add extracted patient name if available
                            if "extracted_data" in result and "patient_name" in result["extracted_data"]:
                                patient_data = result["extracted_data"]["patient_name"]
                                if isinstance(patient_data, dict) and "value" in patient_data:
                                    order_info["patient_name"] = patient_data["value"]
                    except Exception as e:
                        print(f"Error reading result file: {str(e)}")
                
                orders.append(order_info)
        
        return jsonify(orders)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/orders/<order_id>', methods=['GET'])
def get_order(order_id):
    """Get a specific order's details"""
    try:
        result_path = OUTPUT_DIR / f"{order_id}_results.json"
        
        if not result_path.exists():
            # Check if the order folder exists
            order_folder = INPUT_DIR / order_id
            if not order_folder.exists() or not order_folder.is_dir():
                return jsonify({"error": f"Order not found: {order_id}"}), 404
                
            return jsonify({
                "order_id": order_id,
                "status": "Pending",
                "message": "Order exists but has not been processed yet"
            })
        
        with open(result_path, 'r', encoding='utf-8') as f:
            result = json.load(f)
            
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/orders/<order_id>/process', methods=['POST'])
def process_order(order_id):
    """Process or reprocess an order"""
    try:
        order_folder = INPUT_DIR / order_id
        
        if not order_folder.exists() or not order_folder.is_dir():
            return jsonify({"error": f"Order folder not found: {order_id}"}), 404
        
        # Initialize Document AI
        initialize_documentai()
        
        # Process the order using existing pipeline
        order_data = process_order_folder(order_folder)
        
        if not order_data["documents"]:
            return jsonify({"error": f"No valid documents found in order folder: {order_id}"}), 400
        
        api_request = format_llm_request(order_data)
        llm_response = call_llm_api(api_request)
        
        # Save results using existing function
        results = save_results(order_id, order_data, api_request, llm_response)
        
        return jsonify({"message": f"Order {order_id} processed successfully", "results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/orders/<order_id>/update', methods=['POST'])
def update_order(order_id):
    """Update extracted data for an order"""
    try:
        data = request.json
        result_path = OUTPUT_DIR / f"{order_id}_results.json"
        
        if not result_path.exists():
            return jsonify({"error": f"Order results not found: {order_id}"}), 404
        
        # Read current results
        with open(result_path, 'r', encoding='utf-8') as f:
            results = json.load(f)
        
        # Update extracted data fields
        if 'extracted_data' in data:
            for field, field_data in data['extracted_data'].items():
                if field in results['extracted_data']:
                    # Update the value but keep track of original
                    if 'original_value' not in results['extracted_data'][field]:
                        results['extracted_data'][field]['original_value'] = results['extracted_data'][field]['value']
                    
                    results['extracted_data'][field]['value'] = field_data['value']
                    results['extracted_data'][field]['edited'] = True
        
        # Save updated results
        with open(result_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
        
        return jsonify({"message": f"Order {order_id} updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/orders/<order_id>/approve', methods=['POST'])
def approve_order(order_id):
    """Mark an order as approved for CRM insertion"""
    try:
        result_path = OUTPUT_DIR / f"{order_id}_results.json"
        
        if not result_path.exists():
            return jsonify({"error": f"Order results not found: {order_id}"}), 404
        
        # Read current results
        with open(result_path, 'r', encoding='utf-8') as f:
            results = json.load(f)
        
        # Add approval status
        results['status'] = 'Approved'
        results['approved_date'] = str(datetime.datetime.now())
        
        # Save updated results
        with open(result_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
        
        # Here you would add code to format and send to your CRM
        
        return jsonify({"message": f"Order {order_id} approved for CRM insertion"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/orders/<order_id>/providers', methods=['GET'])
def get_order_providers(order_id):
    """Get nearby providers for an order based on patient location"""
    try:
        print(f"Getting providers for order: {order_id}")
        result_path = OUTPUT_DIR / f"{order_id}_results.json"
        
        if not result_path.exists():
            print(f"Results file not found: {result_path}")
            return jsonify({"error": f"Order results not found: {order_id}"}), 404
        
        # Read current results
        with open(result_path, 'r', encoding='utf-8') as f:
            results = json.load(f)
        
        print(f"Results loaded. Keys available: {list(results.keys())}")
        
        # Check if we have mapping data with coordinates
        if "mapping_data" not in results:
            print("No mapping_data found in results")
            return jsonify({"error": "No location data available for this order"}), 400
            
        print(f"Mapping data keys: {list(results['mapping_data'].keys())}")
            
        if "geocode_data" not in results["mapping_data"]:
            print("No geocode_data found in mapping_data")
            return jsonify({"error": "No location data available for this order"}), 400
            
        geocode_data = results["mapping_data"]["geocode_data"]
        print(f"Geocode data: {geocode_data}")
        
        latitude = geocode_data.get("latitude")
        longitude = geocode_data.get("longitude")
        
        if not latitude or not longitude:
            print(f"Invalid coordinates: lat={latitude}, lon={longitude}")
            return jsonify({"error": "Invalid location data"}), 400
            
        # Get procedure code from query parameters
        proc_code = request.args.get('proc_code')
        print(f"Looking for providers near: {latitude}, {longitude} for procedure: {proc_code}")
        
        # Get nearby providers with rates if proc_code provided
        providers = find_nearest_providers(latitude, longitude, proc_code=proc_code, limit=5)
        
        if not providers:
            print("No providers found")
            return jsonify({"error": "No providers found near the patient location"}), 404
            
        print(f"Found {len(providers)} providers")
        response_data = {
            "patient_location": {
                "latitude": latitude,
                "longitude": longitude,
                "address": geocode_data.get("display_name")
            },
            "providers": providers,
            "map_center": {
                "lat": latitude,
                "lon": longitude,
                "zoom": 11
            }
        }
        print(f"Sending response with {len(providers)} providers")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error in get_order_providers: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/orders/<order_id>/select-provider', methods=['POST'])
def select_provider(order_id):
    """Select a provider for an order"""
    try:
        data = request.json
        provider_id = data.get('provider_id')
        
        if not provider_id:
            return jsonify({"error": "No provider ID provided"}), 400
            
        result_path = OUTPUT_DIR / f"{order_id}_results.json"
        
        if not result_path.exists():
            return jsonify({"error": f"Order results not found: {order_id}"}), 404
        
        # Read current results
        with open(result_path, 'r', encoding='utf-8') as f:
            results = json.load(f)
        
        # Add selected provider to results
        results['selected_provider'] = provider_id
        results['provider_selected_date'] = str(datetime.datetime.now())
        
        # Save updated results
        with open(result_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
        
        return jsonify({"message": f"Provider {provider_id} selected for order {order_id}"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/orders/<order_id>/documents', methods=['GET'])
def get_order_documents(order_id):
    """Get list of documents for an order"""
    try:
        order_folder = INPUT_DIR / order_id
        if not order_folder.exists() or not order_folder.is_dir():
            return jsonify({"error": f"Order folder not found: {order_id}"}), 404
            
        documents = []
        for file_path in order_folder.glob("*"):
            if file_path.is_file():
                # Get OCR text if available
                ocr_path = OCR_DIR / f"{order_id}_{file_path.stem}.txt"
                ocr_text = None
                if ocr_path.exists():
                    with open(ocr_path, 'r', encoding='utf-8') as f:
                        ocr_text = f.read()
                
                documents.append({
                    "name": file_path.name,
                    "type": file_path.suffix.lower(),
                    "size": file_path.stat().st_size,
                    "ocr_text": ocr_text
                })
        
        return jsonify(documents)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/orders/<order_id>/documents/<filename>', methods=['GET'])
def get_document_file(order_id, filename):
    """Serve a document file for preview"""
    try:
        file_path = INPUT_DIR / order_id / filename
        if not file_path.exists() or not file_path.is_file():
            return jsonify({"error": f"Document not found: {filename}"}), 404
            
        # For PDFs, serve directly
        if file_path.suffix.lower() == '.pdf':
            return send_file(file_path, mimetype='application/pdf')
            
        # For images, serve directly with proper mimetype
        if file_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff']:
            mimetype = 'image/tiff' if file_path.suffix.lower() in ['.tif', '.tiff'] else None
            return send_file(file_path, mimetype=mimetype)
            
        # For text files, serve as plain text
        if file_path.suffix.lower() == '.txt':
            return send_file(file_path, mimetype='text/plain')
            
        # For email files, serve as text with formatting
        if file_path.suffix.lower() == '.eml':
            import email
            from email import policy
            from email.parser import BytesParser
            
            with open(file_path, 'rb') as fp:
                msg = BytesParser(policy=policy.default).parse(fp)
            
            # Extract email content
            email_content = f"""
            From: {msg.get('from', '')}
            To: {msg.get('to', '')}
            Subject: {msg.get('subject', '')}
            Date: {msg.get('date', '')}
            
            Body:
            """
            
            if msg.is_multipart():
                for part in msg.iter_parts():
                    content_type = part.get_content_type()
                    if content_type == "text/plain":
                        email_content += part.get_content()
                    elif content_type == "text/html":
                        # Convert HTML to plain text
                        from bs4 import BeautifulSoup
                        soup = BeautifulSoup(part.get_content(), 'html.parser')
                        email_content += soup.get_text()
            else:
                if msg.get_content_type() == "text/plain":
                    email_content += msg.get_content()
                elif msg.get_content_type() == "text/html":
                    # Convert HTML to plain text
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(msg.get_content(), 'html.parser')
                    email_content += soup.get_text()
            
            return Response(email_content, mimetype='text/plain')
            
        # For other files, return error
        return jsonify({"error": f"Unsupported file type: {file_path.suffix}"}), 400
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Testing provider database connection...")
    if not test_database_connection():
        print("WARNING: Provider database connection failed. Provider mapping features may not work correctly.")
    else:
        print("Provider database connection successful!")
    
    app.run(debug=True, port=5000)