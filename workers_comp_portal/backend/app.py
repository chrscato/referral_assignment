from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import sys
import json
from pathlib import Path
# Add to your imports at the top
from flask import Flask, jsonify, request, render_template


# Add the path to your existing code
sys.path.append(r'C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Intake AI Agent\referrals')

# Import your existing modules
from process import process_order_folder, format_llm_request, save_results
from llm_client import call_llm_api
from extract import initialize_documentai

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

if __name__ == '__main__':
    import datetime  # Add import at the top if running
    app.run(debug=True, port=5000)