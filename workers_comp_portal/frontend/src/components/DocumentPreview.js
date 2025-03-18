import React, { useState, useEffect } from 'react';
import { fetchOrderDocuments, getDocumentPreviewUrl } from '../services/api';
import { FileText, Image, File } from 'lucide-react';

const DocumentPreview = ({ orderId }) => {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [orderId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await fetchOrderDocuments(orderId);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case '.pdf':
        return <FileText className="h-5 w-5" />;
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif':
      case '.bmp':
        return <Image className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-4 border-b">
        <h2 className="text-lg font-medium">Documents</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* Document List */}
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.name}
              className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
                selectedDoc?.name === doc.name ? 'bg-blue-50 border border-blue-200' : 'border border-gray-200'
              }`}
              onClick={() => setSelectedDoc(doc)}
            >
              <div className="flex-shrink-0 text-gray-500">
                {getFileIcon(doc.type)}
              </div>
              <div className="ml-3 flex-1">
                <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                <div className="text-xs text-gray-500">
                  {formatFileSize(doc.size)} • {doc.type}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Preview Area */}
        <div className="border rounded-lg p-4">
          {selectedDoc ? (
            <div className="h-full">
              {selectedDoc.type === '.pdf' && (
                <iframe
                  src={getDocumentPreviewUrl(orderId, selectedDoc.name)}
                  className="w-full h-[600px] border-0"
                  title={selectedDoc.name}
                />
              )}
              
              {(selectedDoc.type === '.jpg' || 
                selectedDoc.type === '.jpeg' || 
                selectedDoc.type === '.png' || 
                selectedDoc.type === '.gif' || 
                selectedDoc.type === '.bmp') && (
                <img
                  src={getDocumentPreviewUrl(orderId, selectedDoc.name)}
                  alt={selectedDoc.name}
                  className="max-w-full h-auto"
                />
              )}
              
              {selectedDoc.type === '.txt' && (
                <pre className="whitespace-pre-wrap text-sm">
                  {selectedDoc.ocr_text || 'No OCR text available'}
                </pre>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a document to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview; 