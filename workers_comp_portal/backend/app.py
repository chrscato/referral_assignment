from flask import Flask, jsonify, request, send_file, Response, render_template, redirect, url_for
from flask_cors import CORS
import os
import sys
import json
from pathlib import Path
import datetime
import random  # For mock dashboard data

# Add the path to your existing code
sys.path.append(r'C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Intake AI Agent\referrals')

# Import your existing modules
from process import process_order_folder, format_llm_request, save_results
from llm_client import call_llm_api
from extract import initialize_documentai
from provider_mapping_simple import find_nearest_providers, test_database_connection

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Set secret key for session
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')

# Configure paths
INPUT_DIR = Path(r'C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Intake AI Agent\data\orders')
OUTPUT_DIR = Path(r'C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Intake AI Agent\data\results')
OCR_DIR = Path(r'C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Intake AI Agent\data\ocr')

# Root route redirects to dashboard
@app.route('/')
def root():
    return redirect(url_for('dashboard'))

# Orders page
@app.route('/orders')
def index():
    # Get selected order ID from query params if any
    selected_order = request.args.get('order')
    # Instead of passing current_user, we'll use a mock user
    mock_user = {"name": "Demo User"}
    return render_template('index.html', selected_order=selected_order, current_user=mock_user)

@app.route('/dashboard')
def dashboard():
    # Get all orders
    orders = []
    for folder in INPUT_DIR.glob("*"):
        if folder.is_dir():
            order_id = folder.name
            result_path = OUTPUT_DIR / f"{order_id}_results.json"
            status = "Processed" if result_path.exists() else "Pending"
            
            order_info = {
                "order_id": order_id,
                "status": status,
                "processed_date": None,
                "patient_name": "Unknown Patient"
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
                                
                        # Add status and date
                        order_info["status"] = result.get("status", status)
                        order_info["processed_date"] = result.get("processed_date")
                except Exception as e:
                    print(f"Error reading result file: {str(e)}")
            
            orders.append(order_info)
    
    # Calculate stats
    total_orders = len(orders)
    pending_orders = sum(1 for order in orders if order['status'].lower() == 'pending')
    processed_orders = sum(1 for order in orders if order['status'].lower() == 'processed')
    approved_orders = sum(1 for order in orders if order['status'].lower() == 'approved')
    error_orders = sum(1 for order in orders if 'error' in order['status'].lower())
    
    # Generate random data for timeline (last 7 days)
    today = datetime.datetime.now()
    timeline_labels = []
    timeline_data = []
    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        timeline_labels.append(day.strftime('%b %d'))
        timeline_data.append(random.randint(0, 5))  # Random data for demonstration
    
    # Calculate percentages
    pending_percentage = round((pending_orders / total_orders * 100) if total_orders > 0 else 0)
    processed_percentage = round((processed_orders / total_orders * 100) if total_orders > 0 else 0)
    approved_percentage = round((approved_orders / processed_orders * 100) if processed_orders > 0 else 0)
    
    # Prepare stats
    stats = {
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'processed_orders': processed_orders,
        'approved_orders': approved_orders,
        'error_orders': error_orders,
        'new_orders_today': random.randint(0, 3),  # Random for demonstration
        'pending_percentage': pending_percentage,
        'processed_percentage': processed_percentage,
        'approved_percentage': approved_percentage
    }
    
    # Get 5 most recent orders
    recent_orders = sorted(orders, key=lambda x: x.get('processed_date', '') or '', reverse=True)[:5]
    # Add status class for UI
    for order in recent_orders:
        status = order.get('status', '').lower()
        if status == 'approved':
            order['status_class'] = 'bg-green-100 text-green-800'
        elif status == 'processed':
            order['status_class'] = 'bg-yellow-100 text-yellow-800'
        elif status == 'pending':
            order['status_class'] = 'bg-blue-100 text-blue-800'
        elif 'error' in status:
            order['status_class'] = 'bg-red-100 text-red-800'
        else:
            order['status_class'] = 'bg-gray-100 text-gray-800'
    
    # Instead of passing current_user, we'll use a mock user
    mock_user = {"name": "Demo User"}
    
    return render_template('dashboard.html', 
                          stats=stats, 
                          recent_orders=recent_orders,
                          timeline_labels=json.dumps(timeline_labels),
                          timeline_data=json.dumps(timeline_data),
                          current_user=mock_user)

# API Routes
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
        
        # Update extracted data fields if provided
        if 'extracted_data' in data:
            # Handle complete replacement of extracted data
            results['extracted_data'] = data['extracted_data']
            
            # Add edit timestamp
            results['last_edited'] = str(datetime.datetime.now())
            results['edited_by'] = "User"  # In a real app, use the actual user
        
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
    
    
@app.route('/api/orders/<order_id>/package-for-crm', methods=['POST'])
def package_for_crm(order_id):
    """Package order data for CRM insertion"""
    try:
        result_path = OUTPUT_DIR / f"{order_id}_results.json"
        
        if not result_path.exists():
            return jsonify({"error": f"Order results not found: {order_id}"}), 404
        
        # Read current results
        with open(result_path, 'r', encoding='utf-8') as f:
            results = json.load(f)
        
        # Create CRM insertion folder
        crm_dir = Path(r'C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Intake AI Agent\data\crm_ready')
        order_crm_dir = crm_dir / order_id
        order_crm_dir.mkdir(exist_ok=True, parents=True)
        
        # Create CRM-ready format from results
        crm_data = {
            "order_id": order_id,
            "patient_info": {},
            "procedures": [],
            "provider_data": {}
        }
        
        # Extract patient information
        for field, data in results['extracted_data']['patient_info'].items():
            if data['value'] and data['value'] != "not found" and data['value'] != "null":
                crm_data['patient_info'][field] = data['value']
        
        # Extract procedures
        for procedure in results['extracted_data']['procedures']:
            proc_data = {}
            for field, data in procedure.items():
                if data['value'] and data['value'] != "not found" and data['value'] != "null":
                    proc_data[field] = data['value']
            
            if proc_data:  # Only add if we have data
                crm_data['procedures'].append(proc_data)
        
        # Add provider information if available
        if 'provider_mapping' in results and results['provider_mapping']['status'] == 'success':
            for proc_mapping in results['provider_mapping']['procedures']:
                if 'providers' in proc_mapping and proc_mapping['providers']:
                    # Just get the first provider for each procedure (closest one)
                    provider = proc_mapping['providers'][0]
                    
                    # Match provider to procedure by CPT code if possible
                    cpt_code = proc_mapping.get('cpt_code')
                    
                    # Add to provider data
                    if cpt_code not in crm_data['provider_data']:
                        crm_data['provider_data'][cpt_code] = []
                    
                    provider_info = {
                        "name": provider.get("DBA Name Billing Name"),
                        "address": f"{provider.get('City')}, {provider.get('State')}",
                        "phone": provider.get("Phone"),
                        "fax": provider.get("Fax Number"),
                        "network_status": provider.get("Provider Network"),
                        "distance_miles": provider.get("distance_miles")
                    }
                    crm_data['provider_data'][cpt_code].append(provider_info)
        
        # Save the final CRM-ready JSON
        crm_json_path = order_crm_dir / f"{order_id}_crm.json"
        with open(crm_json_path, 'w', encoding='utf-8') as f:
            json.dump(crm_data, f, indent=2)
            
        # Mark order as "Ready for CRM"
        results['status'] = 'Ready for CRM'
        results['crm_ready_date'] = str(datetime.datetime.now())
        
        # Save updated results back to results file
        with open(result_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
        
        return jsonify({
            "message": f"Order {order_id} packaged for CRM insertion",
            "crm_path": str(crm_json_path)
        })
    except Exception as e:
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
    
    app.run(debug=True, port=5003)