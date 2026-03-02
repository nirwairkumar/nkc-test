import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableBody
} from "@/components/ui/table";

interface PageStat {
    path: string;
    views: number;
}

export default function TopPagesTable({ data }: { data: PageStat[] }) {
    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle>Top Pages</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Path</TableHead>
                            <TableHead className="text-right">Views</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data && data.length > 0 ? (
                            data.map((page, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium max-w-[200px] truncate" title={page.path}>
                                        {page.path}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {page.views.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                                    No data available
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
