import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    const { user } = useAuth();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);

    // File Upload State
    const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileTitle, setFileTitle] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('none');

    // Link Add State
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    const [linkThumbnail, setLinkThumbnail] = useState('');
    const [processingLink, setProcessingLink] = useState(false);
    const [fetchingTitle, setFetchingTitle] = useState(false);

    // Class Management State
    const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [creatingClass, setCreatingClass] = useState(false);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        const [matRes, classRes] = await Promise.all([
            fetchMaterials(user.id),
            fetchClasses(user.id)
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
        if (!user || !newClassName.trim()) return;
        setCreatingClass(true);
        const { data, error } = await createClass(newClassName, user.id);
        setCreatingClass(false);
        if (error) {
            toast.error("Failed to create class");
        } else {
            toast.success("Class created!");
            setClasses(prev => [...prev, data]);
            setNewClassName('');
            setIsClassDialogOpen(false);
            // Auto-select the new class if a dialog is open
            if (isFileDialogOpen || isLinkDialogOpen) {
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
        if (!user || !selectedFile || !fileTitle) return;
        setUploading(true);
        try {
            const classId = selectedClassId === 'none' ? undefined : selectedClassId;
            const { error } = await uploadFileMaterial(selectedFile, fileTitle, user.id, classId);
            if (error) throw error;
            toast.success("File uploaded successfully!");
            setIsFileDialogOpen(false);
            setSelectedFile(null);
            setFileTitle('');
            setSelectedClassId('none');
            loadData(); // Reload to get updated list
        } catch (error: any) {
            toast.error("Upload failed: " + error.message);
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
        if (!user || !linkUrl || !linkTitle) return;
        setProcessingLink(true);
        try {
            const classId = selectedClassId === 'none' ? undefined : selectedClassId;
            const { error } = await addLinkMaterial(linkUrl, linkTitle, user.id, linkThumbnail, classId);
            if (error) throw error;
            toast.success("Link added successfully!");
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
    const links = materials.filter(m => m.type === 'link');

    if (!user) return null;

    return (
        <div className="container mx-auto max-w-5xl py-8 px-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900">Class Materials</h1>
                </div>
                <Button variant="outline" onClick={() => setIsClassDialogOpen(true)}>
                    <GraduationCap className="mr-2 h-4 w-4" /> Manage Classes
                </Button>
            </div>

            <Tabs defaultValue="documents" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="links">Links & Videos</TabsTrigger>
                </TabsList>

                {/* DOCUMENTS TAB */}
                <TabsContent value="documents" className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-dashed">
                        <div>
                            <h3 className="font-semibold text-slate-700">Upload Documents</h3>
                            <p className="text-sm text-slate-500">PDFs, PPTs, or Notes.</p>
                        </div>
                        <Button onClick={() => setIsFileDialogOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" /> Upload File
                        </Button>
                    </div>

                    {loading ? (
                        <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-primary" /></div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-slate-50/50 rounded-lg">
                            <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            No documents uploaded yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {files.map(file => (
                                <Card key={file.id} className="hover:shadow-md transition-shadow relative group">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleDelete(file.id, file.file_path)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <CardContent className="p-4 flex items-start gap-3">
                                        <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold truncate" title={file.title}>{file.title}</h4>

                                            {/* @ts-ignore - joined data */}
                                            {file.classes?.name && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mb-1">
                                                    {/* @ts-ignore */}
                                                    {file.classes.name}
                                                </span>
                                            )}

                                            <p className="text-xs text-muted-foreground mb-2 mt-1">{new Date(file.created_at).toLocaleDateString()}</p>
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center">
                                                View Document <ExternalLink className="ml-1 h-3 w-3" />
                                            </a>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* LINKS TAB */}
                <TabsContent value="links" className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-dashed">
                        <div>
                            <h3 className="font-semibold text-slate-700">Add Links</h3>
                            <p className="text-sm text-slate-500">YouTube videos or external resources.</p>
                        </div>
                        <Button onClick={() => setIsLinkDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Add Link
                        </Button>
                    </div>

                    {loading ? (
                        <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-primary" /></div>
                    ) : links.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-slate-50/50 rounded-lg">
                            <Youtube className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            No links added yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {links.map(link => (
                                <Card key={link.id} className="hover:shadow-md transition-shadow overflow-hidden group">
                                    <div className="relative aspect-video bg-slate-100">
                                        {link.thumbnail_url ? (
                                            <img src={link.thumbnail_url} alt={link.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-300">
                                                <LinkIcon className="h-10 w-10" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleDelete(link.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        {/* Play Overlay for YT */}
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors group/play">
                                            <div className="bg-white/80 p-2 rounded-full group-hover/play:scale-110 transition-transform">
                                                <ExternalLink className="h-5 w-5 text-slate-800" />
                                            </div>
                                        </a>
                                    </div>
                                    <div className="p-3">
                                        <h4 className="font-semibold truncate leading-tight mb-1" title={link.title}>{link.title}</h4>
                                        {/* @ts-ignore - joined data */}
                                        {link.classes?.name && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mb-1">
                                                {/* @ts-ignore */}
                                                {link.classes.name}
                                            </span>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-1">{new Date(link.created_at).toLocaleDateString()}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

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

            {/* ADD LINK DIALOG */}
            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Link</DialogTitle>
                        <DialogDescription>Add a YouTube video or external website link.</DialogDescription>
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
                            <Input id="linkTitle" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Video or Page Title" />
                            <p className="text-xs text-muted-foreground">You can edit the title if needed.</p>
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
        </div>
    );
}
