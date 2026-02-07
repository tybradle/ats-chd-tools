import { useEffect, useRef, useState } from 'react';
import { useLoadCalcProjectStore } from "@/stores/load-calc-project-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RefreshCw, Clipboard, ChevronDown, Thermometer, Zap, BarChart3, Loader2, FileSpreadsheet, FileText, Image } from "lucide-react";
import { HeatReport } from "./reports/heat-report";
import { LoadingReport } from "./reports/loading-report";
import { BalanceReport } from "./reports/balance-report";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  copyReportToClipboard,
  exportReportsToXlsx,
  exportReportsToPdf,
  exportReportToPng,
} from "@/lib/load-calc/export";

type ReportTab = 'heat' | 'loading' | 'balance';

const TAB_LABELS: Record<ReportTab, string> = {
  heat: 'Heat',
  loading: 'Loading',
  balance: 'Balance',
};

export function ReportsView() {
  const {
    currentProject,
    generateReports,
    refreshReports,
    isGeneratingReports,
    reportData
  } = useLoadCalcProjectStore();

  const [activeTab, setActiveTab] = useState<ReportTab>('heat');
  const [isExporting, setIsExporting] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentProject && !reportData) {
      generateReports();
    }
  }, [currentProject, reportData, generateReports]);

  const handleCopyToClipboard = async () => {
    if (!reportData) return;
    try {
      await copyReportToClipboard(activeTab, reportData);
      toast.success(`${TAB_LABELS[activeTab]} report copied to clipboard`);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleExportXlsx = async () => {
    if (!reportData || !currentProject) return;
    setIsExporting(true);
    try {
      await exportReportsToXlsx(reportData, currentProject.name);
      toast.success('Exported to Excel');
    } catch (err) {
      console.error('XLSX export failed:', err);
      toast.error('Excel export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!reportData || !currentProject) return;
    setIsExporting(true);
    try {
      await exportReportsToPdf(reportData, currentProject.name);
      toast.success('Exported to PDF');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('PDF export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPng = async () => {
    if (!reportContentRef.current || !currentProject) return;
    setIsExporting(true);
    try {
      await exportReportToPng(reportContentRef.current, currentProject.name, TAB_LABELS[activeTab]);
      toast.success(`Exported ${TAB_LABELS[activeTab]} report as PNG`);
    } catch (err) {
      console.error('PNG export failed:', err);
      toast.error('PNG export failed');
    } finally {
      setIsExporting(false);
    }
  };

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-4">
        <div className="p-4 rounded-full bg-muted">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">No Project Selected</p>
          <p className="text-sm">Select a project in the Project View tab to see reports.</p>
        </div>
      </div>
    );
  }

  const hasData = !!reportData;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">Project Reports</h2>
          <p className="text-sm text-muted-foreground">
            Consolidated engineering reports for {currentProject.name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshReports}
            disabled={isGeneratingReports}
          >
            {isGeneratingReports ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyToClipboard}
            disabled={!hasData || isExporting}
          >
            <Clipboard className="mr-2 h-4 w-4" />
            Copy Table
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="sm"
                disabled={!hasData || isExporting}
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChevronDown className="mr-2 h-4 w-4" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportXlsx}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                All Reports as Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdf}>
                <FileText className="mr-2 h-4 w-4" />
                All Reports as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPng}>
                <Image className="mr-2 h-4 w-4" />
                Current Report as PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Separator />

      {isGeneratingReports && !reportData ? (
        <div className="flex flex-col items-center justify-center h-[400px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            Generating project reports...
          </p>
        </div>
      ) : (
        <Tabs
          defaultValue="heat"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ReportTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 max-w-[600px] bg-muted/50 p-1">
            <TabsTrigger value="heat" className="flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Heat (Watts)
            </TabsTrigger>
            <TabsTrigger value="loading" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Loading
            </TabsTrigger>
            <TabsTrigger value="balance" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Balance
            </TabsTrigger>
          </TabsList>

          <div className="mt-6" ref={reportContentRef}>
            <TabsContent value="heat" className="focus-visible:outline-none">
              <HeatReport />
            </TabsContent>
            <TabsContent value="loading" className="focus-visible:outline-none">
              <LoadingReport />
            </TabsContent>
            <TabsContent value="balance" className="focus-visible:outline-none">
              <BalanceReport />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}
