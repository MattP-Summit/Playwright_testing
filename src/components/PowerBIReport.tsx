import { useState, useEffect } from 'react';
import { PowerBIEmbed } from 'powerbi-client-react';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, RefreshCw, ChevronDown, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PowerBIEmbedConfig {
  type: string;
  id?: string;
  embedUrl?: string;
  reports?: Array<{
    id: string;
    name: string;
    embedUrl: string;
  }>;
  accessToken: string;
  tokenType: number;
  hostname: string;
  settings?: {
    panes: {
      filters: { expanded: boolean; visible: boolean };
    };
  };
}

const PowerBIReport = () => {
  const [embedConfig, setEmbedConfig] = useState<PowerBIEmbedConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEmbedInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Always call the same endpoint - backend auto-detects from config
      const url = 'http://localhost:5000/getEmbedToken';

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setEmbedConfig(data);

      // Set current report to first one if multiple reports
      if (data.reports && data.reports.length > 1) {
        setCurrentReportId(data.reports[0].id);
      } else if (data.id) {
        setCurrentReportId(data.id);
      }

      toast({
        title: "Report(s) loaded successfully",
        description: `PowerBI ${data.type === 'multiple_reports' ? 'reports are' : 'report is'} ready to view`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load PowerBI embed configuration';
      setError(errorMessage);

      toast({
        title: "Failed to load report(s)",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always call the same endpoint - backend auto-detects from config
    fetchEmbedInfo();
  }, []);

  const handleReportSelect = (reportId: string) => {
    setCurrentReportId(reportId);
  };

  const handleRetry = () => {
    fetchEmbedInfo();
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading PowerBI reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-muted rounded-lg">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <div>
            <h3 className="font-medium text-destructive">Failed to Load Reports</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={handleRetry} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!embedConfig) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No embed configuration available</p>
        </div>
      </div>
    );
  }

  // Multiple reports with navigation
  if (embedConfig.reports && embedConfig.reports.length > 1 && currentReportId) {
    const currentReport = embedConfig.reports.find(r => r.id === currentReportId);

    if (!currentReport) return null;

    return (
      <div className="h-screen w-screen flex flex-col">
        {/* Navigation Header */}
        <div className="flex items-center justify-between p-4 bg-background border-b">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Power BI Reports</h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[250px] justify-between">
                <span className="truncate">
                  {currentReport.name || 'Select Report'}
                </span>
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[250px]">
              {embedConfig.reports.map((report) => (
                <DropdownMenuItem
                  key={report.id}
                  onClick={() => handleReportSelect(report.id)}
                  className={currentReportId === report.id ? 'bg-accent' : ''}
                >
                  <span className="font-medium">{report.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Report Content */}
        <div className="flex-1 p-4">
          <div className="h-full w-full bg-background rounded-lg border">
            <PowerBIEmbed
              embedConfig={{
                ...embedConfig,
                id: currentReport.id,
                embedUrl: currentReport.embedUrl,
              }}
              eventHandlers={new Map([
                ['loaded', () => console.log(`Report ${currentReport.name} loaded`)],
                ['rendered', () => console.log(`Report ${currentReport.name} rendered`)],
                ['error', (event: any) => console.error(`Report ${currentReport.name} error:`, event.detail)]
              ])}
              cssClassName="h-full w-full"
            />
          </div>
        </div>
      </div>
    );
  }

  // Single report (existing behavior)
  return (
    <div className="h-screen w-screen">
      <div className="h-full w-full bg-background">
        <PowerBIEmbed
          embedConfig={embedConfig}
          eventHandlers={new Map([
            ['loaded', () => console.log('Report loaded')],
            ['rendered', () => console.log('Report rendered')],
            ['error', (event: any) => console.error('Report error:', event.detail)]
          ])}
          cssClassName="h-[720px] w-[1280px]"
        />
      </div>
    </div>
  );
};

export default PowerBIReport;