import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Link as LinkIcon, Trash2, Upload, Plus, ExternalLink, Image as ImageIcon, Loader2, Youtube, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import {
    Material,
    fetchMaterials,
    uploadFileMaterial,
    addLinkMaterial,
    deleteMaterial,
    getYouTubeInfo
} from '@/lib/materialsApi';
import { ClassItem, fetchClasses, createClass, deleteClass } from '@/lib/classesApi';

export default function MaterialsManager() {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(window.location.search);
    const impersonateUserId = queryParams.get("userId");
    const targetUserId = (isAdmin && impersonateUserId) ? impersonateUserId : user?.id;
    const [targetUserProfile, setTargetUserProfile] = useState<any>(null);

    const [materials, setMaterials] = useState<Material[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);

    // File Upload State
    const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileTitle, setFileTitle] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('none');

    // Link Add State (Video)
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    const [linkThumbnail, setLinkThumbnail] = useState('');
    const [processingLink, setProcessingLink] = useState(false);
    const [fetchingTitle, setFetchingTitle] = useState(false);

    // External Link Add State
    const [isExternalLinkDialogOpen, setIsExternalLinkDialogOpen] = useState(false);
    const [externalLinkUrl, setExternalLinkUrl] = useState('');
    const [externalLinkTitle, setExternalLinkTitle] = useState('');
    const [processingExternalLink, setProcessingExternalLink] = useState(false);

    // Class Management State
    const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [creatingClass, setCreatingClass] = useState(false);

    useEffect(() => {
        if (impersonateUserId && !isAdmin) {
            toast.error("You are not authorized to view this user's materials.");
            navigate('/materials', { replace: true });
            return;
        }
        if (targetUserId) {
            loadData();
            if (targetUserId !== user?.id) {
                const fetchTargetCreator = async () => {
                    const { fetchUserDetails } = await import('@/lib/usersApi');
                    const { data } = await fetchUserDetails(targetUserId);
                    if (data) setTargetUserProfile(data);
                };
                fetchTargetCreator();
            }
        }
    }, [targetUserId, impersonateUserId, isAdmin, navigate]);

    const loadData = async () => {
        if (!targetUserId) return;
        setLoading(true);
        const [matRes, classRes] = await Promise.all([
            fetchMaterials(targetUserId),
            fetchClasses(targetUserId)
        ]);

        if (matRes.error) {
            toast.error("Failed to load materials");
            console.error(matRes.error);
        } else {
            setMaterials(matRes.data || []);
        }

        if (classRes.error) {
            console.error("Failed to load classes", classRes.error);
        } else {
            setClasses(classRes.data || []);
        }
        setLoading(false);
    };

    // --- Class Handlers ---
    const handleCreateClass = async () => {
        if (!targetUserId || !newClassName.trim()) return;
        setCreatingClass(true);
        const { data, error } = await createClass(newClassName, targetUserId);
        setCreatingClass(false);
        if (error) {
            toast.error("Failed to create class");
        } else {
            toast.success("Class created!");
            setClasses(prev => [...prev, data]);
            setNewClassName('');
            setIsClassDialogOpen(false);
            // Auto-select the new class if a dialog is open
            if (isFileDialogOpen || isLinkDialogOpen || isExternalLinkDialogOpen) {
                setSelectedClassId(data.id);
            }
        }
    };

    const handleDeleteClass = async (id: string) => {
        if (!confirm("Delete this class? Materials assigned to it will remain but become unassigned.")) return;
        const { error } = await deleteClass(id);
        if (error) {
            toast.error("Failed to delete class");
        } else {
            toast.success("Class deleted");
            setClasses(prev => prev.filter(c => c.id !== id));
        }
    };

    // --- File Handlers ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setFileTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
    };

    const handleFileUpload = async () => {
        if (!targetUserId || !selectedFile || !fileTitle) return;
        setUploading(true);
        try {
            const classId = selectedClassId === 'none' ? undefined : selectedClassId;
            const { error } = await uploadFileMaterial(selectedFile, fileTitle, targetUserId, classId);
            if (error) throw error;
            toast.success("File uploaded successfully!");
            setIsFileDialogOpen(false);
            setSelectedFile(null);
            setFileTitle('');
            setSelectedClassId('none');
            loadData(); // Reload to get updated list
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || error.message || "Upload failed";
            toast.error("Upload failed: " + msg);
        } finally {
            setUploading(false);
        }
    };

    // --- Link Handlers ---
    const handleLinkUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setLinkUrl(url);

        // Auto-detect YouTube (Async now)
        setFetchingTitle(true);
        const ytInfo = await getYouTubeInfo(url);
        setFetchingTitle(false);

        if (ytInfo) {
            setLinkThumbnail(ytInfo.thumbnail);
            if (ytInfo.title) {
                setLinkTitle(ytInfo.title);
            } else if (!linkTitle) {
                setLinkTitle("YouTube Video");
            }
        }
    };

    const handleAddLink = async () => {
        if (!targetUserId || !linkUrl || !linkTitle) return;
        setProcessingLink(true);
        try {
            const classId = selectedClassId === 'none' ? undefined : selectedClassId;
            const { error } = await addLinkMaterial(linkUrl, linkTitle, targetUserId, 'link', linkThumbnail, classId);
            if (error) throw error;
            toast.success("Video link added successfully!");
            setIsLinkDialogOpen(false);
            setLinkUrl('');
            setLinkTitle('');
            setLinkThumbnail('');
            setSelectedClassId('none');
            loadData();
        } catch (error: any) {
            toast.error("Failed to add link: " + error.message);
        } finally {
            setProcessingLink(false);
        }
    };

    // --- External Link Handlers ---
    const handleExternalLinkUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setExternalLinkUrl(e.target.value);
    };

    const handleAddExternalLink = async () => {
        if (!targetUserId || !externalLinkUrl || !externalLinkTitle) return;
        setProcessingExternalLink(true);
        try {
            const classId = selectedClassId === 'none' ? undefined : selectedClassId;
            // Use 'external' type
            const { error } = await addLinkMaterial(externalLinkUrl, externalLinkTitle, targetUserId, 'external', undefined, classId);
            if (error) throw error;
            toast.success("External link added successfully!");
            setIsExternalLinkDialogOpen(false);
            setExternalLinkUrl('');
            setExternalLinkTitle('');
            setSelectedClassId('none');
            loadData();
        } catch (error: any) {
            // Fallback if migration hasn't run: try adding as 'link' but we prefer 'external'
            // If the error is regarding check constraint, user needs to run migration.
            if (error.message?.includes('violates check constraint')) {
                toast.error("Database update required. Please run the migration script.");
            } else {
                toast.error("Failed to add link: " + error.message);
            }
        } finally {
            setProcessingExternalLink(false);
        }
    };


    // --- Delete Handler ---
    const handleDelete = async (id: string, filePath?: string) => {
        if (!confirm("Are you sure you want to delete this material?")) return;
        try {
            const { error } = await deleteMaterial(id, filePath);
            if (error) throw error;
            toast.success("Material deleted");
            setMaterials(prev => prev.filter(m => m.id !== id));
        } catch (error: any) {
            toast.error("Delete failed: " + error.message);
        }
    };

    const files = materials.filter(m => m.type === 'file');
    const videoLinks = materials.filter(m => m.type === 'link');
    const [activeTab, setActiveTab] = useState<'documents' | 'links' | 'external'>('documents');
    const externalLinks = materials.filter(m => m.type === 'external');

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {isAdmin && impersonateUserId && targetUserProfile && (
                <div className="max-w-5xl mx-auto px-4 pt-4">
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-sm font-medium">
                                Impersonating materials manager for <strong>{targetUserProfile.full_name || targetUserProfile.email}</strong>
                            </span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-800 hover:bg-amber-100" onClick={() => navigate('/manage-tests?tab=users')}>
                            Back to Admin Dashboard
                        </Button>
                    </div>
                </div>
            )}
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 pt-8 pb-16">
                <div className="max-w-5xl mx-auto flex items-end justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Creator Tools</p>
                        <p className="text-xl sm:text-2xl font-bold text-white">Class Materials</p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsClassDialogOpen(true)}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs font-semibold"
                    >
                        <GraduationCap className="mr-1.5 h-3.5 w-3.5" /> Classes
                    </Button>
                </div>
            </div>

            <div className="px-4 -mt-10 pb-10 max-w-5xl mx-auto">

                {/* Custom Tab Bar */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-1 flex gap-1 mb-4">
                    {([
                        { value: 'documents', label: 'Documents', count: files.length },
                        { value: 'links', label: 'Videos', count: videoLinks.length },
                        { value: 'external', label: 'Links', count: externalLinks.length },
                    ] as const).map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                activeTab === tab.value
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <span>{tab.label}</span>
                            {tab.count > 0 && (
                                <span className={`text-[9px] font-black rounded-full px-1.5 py-0.5 ${activeTab === tab.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}

                </div>

                {/* DOCUMENTS TAB */}
                {activeTab === 'documents' && (
                    <div className="space-y-3">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Upload Documents</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">PDFs, PPTs, or Notes</p>
                            </div>
                            <Button size="sm" onClick={() => setIsFileDialogOpen(true)} className="text-xs font-semibold shrink-0">
                                <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
                            </Button>
                        </div>
                        {loading ? (
                            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500 h-7 w-7" /></div>
                        ) : files.length === 0 ? (
                            <div className="text-center py-14 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <FileText className="h-10 w-10 mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                                <p className="text-sm font-semibold text-slate-500">No documents uploaded yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {files.map(file => (
                                    <div key={file.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-start gap-3 hover:shadow-md transition-shadow group relative">
                                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={file.title}>{file.title}</p>
                                            {/* @ts-ignore */}
                                            {file.classes?.name && <span className="inline-block text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full mt-1">{(file.classes as any).name}</span>}
                                            <p className="text-[10px] text-slate-400 mt-1">{new Date(file.created_at).toLocaleDateString()}</p>
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 font-medium hover:underline flex items-center mt-1.5">
                                                View <ExternalLink className="ml-1 h-3 w-3" />
                                            </a>
                                        </div>
                                        <button onClick={() => handleDelete(file.id, file.file_path)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* VIDEOS TAB */}
                {activeTab === 'links' && (
                    <div className="space-y-3">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Video Links</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">YouTube & other video resources</p>
                            </div>
                            <Button size="sm" onClick={() => setIsLinkDialogOpen(true)} className="text-xs font-semibold shrink-0">
                                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Video
                            </Button>
                        </div>
                        {loading ? (
                            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500 h-7 w-7" /></div>
                        ) : videoLinks.length === 0 ? (
                            <div className="text-center py-14 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <Youtube className="h-10 w-10 mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                                <p className="text-sm font-semibold text-slate-500">No video links added yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {videoLinks.map(link => (
                                    <div key={link.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow group relative">
                                        <div className="relative aspect-video bg-slate-100 dark:bg-slate-800">
                                            {link.thumbnail_url
                                                ? <img src={link.thumbnail_url} alt={link.title} className="w-full h-full object-cover" />
                                                : <div className="flex items-center justify-center h-full"><LinkIcon className="h-8 w-8 text-slate-300" /></div>
                                            }
                                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/25 transition-colors">
                                                <div className="bg-white/90 p-2 rounded-full shadow"><ExternalLink className="h-4 w-4 text-slate-800" /></div>
                                            </a>
                                        </div>
                                        <div className="p-3">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={link.title}>{link.title}</p>
                                            {/* @ts-ignore */}
                                            {link.classes?.name && <span className="inline-block text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full mt-1">{(link.classes as any).name}</span>}
                                            <p className="text-[10px] text-slate-400 mt-1">{new Date(link.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={() => handleDelete(link.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-red-600 text-white">
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* EXTERNAL LINKS TAB */}
                {activeTab === 'external' && (
                    <div className="space-y-3">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">External Links</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Articles, websites, references</p>
                            </div>
                            <Button size="sm" onClick={() => setIsExternalLinkDialogOpen(true)} className="text-xs font-semibold shrink-0 bg-pink-600 hover:bg-pink-700 text-white">
                                <LinkIcon className="mr-1.5 h-3.5 w-3.5" /> Add Link
                            </Button>
                        </div>
                        {loading ? (
                            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500 h-7 w-7" /></div>
                        ) : externalLinks.length === 0 ? (
                            <div className="text-center py-14 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <ExternalLink className="h-10 w-10 mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                                <p className="text-sm font-semibold text-slate-500">No external links added yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {externalLinks.map(link => (
                                    <div key={link.id} className="bg-white dark:bg-slate-900 rounded-2xl border-l-4 border-l-pink-500 border border-slate-100 dark:border-slate-800 p-4 flex items-start gap-3 hover:shadow-md transition-shadow group relative">
                                        <div className="w-10 h-10 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <LinkIcon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={link.title}>{link.title}</p>
                                            {/* @ts-ignore */}
                                            {link.classes?.name && <span className="inline-block text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full mt-1">{(link.classes as any).name}</span>}
                                            <div className="text-[10px] text-slate-400 truncate mt-1">{link.url}</div>
                                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-600 font-medium hover:underline flex items-center mt-1.5">
                                                Visit <ExternalLink className="ml-1 h-3 w-3" />
                                            </a>
                                        </div>
                                        <button onClick={() => handleDelete(link.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* CLASS MANAGER DIALOG */}
            <Dialog open={isClassDialogOpen} onOpenChange={setIsClassDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Classes</DialogTitle>
                        <DialogDescription>Create classes to organize your tests and materials.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="New Class Name (e.g. Physics 101)"
                                value={newClassName}
                                onChange={(e) => setNewClassName(e.target.value)}
                            />
                            <Button onClick={handleCreateClass} disabled={creatingClass || !newClassName.trim()}>
                                {creatingClass ? <Loader2 className="animate-spin" /> : <Plus className="w-4 h-4" />}
                            </Button>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded p-2">
                            {classes.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-4">No classes created yet.</p>
                            ) : (
                                classes.map(cls => (
                                    <div key={cls.id} className="flex justify-between items-center p-2 bg-slate-50 rounded hover:bg-slate-100">
                                        <span className="font-medium text-sm">{cls.name}</span>
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClass(cls.id)} className="text-red-500 hover:text-red-700 h-8 w-8 p-0">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* UPLOAD FILE DIALOG */}
            <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                        <DialogDescription>Upload PDF, PPT, or Word documents.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="file">File</Label>
                            <Input id="file" type="file" onChange={handleFileSelect} />
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" value={fileTitle} onChange={(e) => setFileTitle(e.target.value)} placeholder="Enter document title" />
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                            <Label>Assign to Class (Optional)</Label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a class..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Class</SelectItem>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex justify-end">
                                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setIsClassDialogOpen(true)}>+ Create New Class</Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFileDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleFileUpload} disabled={!selectedFile || !fileTitle || uploading}>
                            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Upload
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ADD VIDEO LINK DIALOG */}
            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Video Link</DialogTitle>
                        <DialogDescription>Add a YouTube video or other video resources.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="url">URL</Label>
                            <div className="relative">
                                <Input id="url" value={linkUrl} onChange={handleLinkUrlChange} placeholder="https://youtube.com/..." />
                                {fetchingTitle && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>
                        </div>
                        {linkThumbnail && (
                            <div className="relative aspect-video rounded-md overflow-hidden bg-slate-100">
                                <img src={linkThumbnail} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="linkTitle">Title</Label>
                            <Input id="linkTitle" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Video Title" />
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                            <Label>Assign to Class (Optional)</Label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a class..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Class</SelectItem>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex justify-end">
                                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setIsClassDialogOpen(true)}>+ Create New Class</Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddLink} disabled={!linkUrl || !linkTitle || processingLink}>
                            {processingLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Link
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ADD EXTERNAL LINK DIALOG */}
            <Dialog open={isExternalLinkDialogOpen} onOpenChange={setIsExternalLinkDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add External Link</DialogTitle>
                        <DialogDescription>Add link to a website, article, or resource.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="extUrl">URL</Label>
                            <Input id="extUrl" value={externalLinkUrl} onChange={handleExternalLinkUrlChange} placeholder="https://example.com/article" />
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="extTitle">Title</Label>
                            <Input id="extTitle" value={externalLinkTitle} onChange={(e) => setExternalLinkTitle(e.target.value)} placeholder="Resource Title" />
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                            <Label>Assign to Class (Optional)</Label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a class..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Class</SelectItem>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex justify-end">
                                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setIsClassDialogOpen(true)}>+ Create New Class</Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExternalLinkDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddExternalLink} disabled={!externalLinkUrl || !externalLinkTitle || processingExternalLink} className="bg-pink-600 hover:bg-pink-700 text-white">
                            {processingExternalLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Link
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
