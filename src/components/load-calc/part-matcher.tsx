import { useState, useEffect } from 'react';
import { useLoadCalcImportStore } from '@/stores/load-calc-import-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, AlertCircle, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';

interface PartMatcherProps {
  onReviewUnmatched?: () => void;
}

export function PartMatcher({ onReviewUnmatched }: PartMatcherProps) {
  const {
    rows,
    matchResults,
    isMatchingInProgress,
    matchingConfig,
    runMatching,
    skipUnmatched,
    selectedVoltageTableId,
    mappings
  } = useLoadCalcImportStore();
  
  const [displayedRows, setDisplayedRows] = useState(10);
  
  // Calculate match statistics
  const stats = {
    total: matchResults.length,
    matched: matchResults.filter(r => r.state === 'matched').length,
    unmatched: matchResults.filter(r => r.state === 'unmatched').length,
    manual: matchResults.filter(r => r.state === 'manual').length,
    skipped: matchResults.filter(r => r.state === 'skipped').length,
    pending: matchResults.filter(r => r.state === 'pending').length
  };
  
  // Auto-run matching when component mounts if not already done
  useEffect(() => {
    if (rows.length > 0 && matchResults.length === 0 && !isMatchingInProgress) {
      runMatching();
    }
  }, [rows.length, matchResults.length, isMatchingInProgress, runMatching]);
  
  const handleRunMatching = async () => {
    try {
      await runMatching();
    } catch (error) {
      toast.error(`Failed to run matching: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleSkipAllUnmatched = () => {
    const unmatchedIndices = matchResults
      .filter(r => r.state === 'unmatched')
      .map(r => r.rowIndex);
    
    if (unmatchedIndices.length > 0) {
      skipUnmatched(unmatchedIndices);
      toast.success(`Skipped ${unmatchedIndices.length} unmatched items`);
    } else {
      toast.info('No unmatched items to skip');
    }
  };
  
  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'matched':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'unmatched':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'manual':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'skipped':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };
  
  const getStatusText = (state: string) => {
    switch (state) {
      case 'matched': return 'Matched';
      case 'unmatched': return 'Unmatched';
      case 'manual': return 'Manual Entry';
      case 'skipped': return 'Skipped';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-amber-600';
    return 'text-red-600';
  };
  
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Part Matching</CardTitle>
          <CardDescription>No data to match. Please upload and map a file first.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Part Matching
          </CardTitle>
          <CardDescription>
            Match imported parts to database entries. Unmatched items can be manually entered or skipped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Rows</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
              <div className="text-sm text-muted-foreground">Matched</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-red-600">{stats.unmatched}</div>
              <div className="text-sm text-muted-foreground">Unmatched</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-amber-600">{stats.manual}</div>
              <div className="text-sm text-muted-foreground">Manual</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-600">{stats.skipped}</div>
              <div className="text-sm text-muted-foreground">Skipped</div>
            </div>
          </div>
          
          {/* Progress bar for matching operation */}
          {isMatchingInProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Matching in progress...</span>
                <span>{Math.round((stats.matched + stats.unmatched + stats.manual + stats.skipped) / stats.total * 100)}%</span>
              </div>
              <Progress value={(stats.matched + stats.unmatched + stats.manual + stats.skipped) / stats.total * 100} />
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleRunMatching} 
              disabled={isMatchingInProgress || rows.length === 0}
            >
              {matchResults.length === 0 ? 'Start Matching' : 'Re-run Matching'}
            </Button>
            
            {stats.unmatched > 0 && (
              <>
                <Button 
                  variant="outline" 
                  onClick={onReviewUnmatched}
                  disabled={isMatchingInProgress}
                >
                  Review Unmatched ({stats.unmatched})
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleSkipAllUnmatched}
                  disabled={isMatchingInProgress}
                >
                  Skip All Unmatched
                </Button>
              </>
            )}
            
            {selectedVoltageTableId && (
              <Badge variant="outline" className="ml-auto">
                Target: Voltage Table #{selectedVoltageTableId}
              </Badge>
            )}
          </div>
          
          {/* Configuration summary */}
          <div className="text-sm text-muted-foreground">
            <div>Matching threshold: {(matchingConfig.matchThreshold * 100).toFixed(0)}%</div>
            <div>Normalization: {matchingConfig.normalizeCase ? 'Case-insensitive' : 'Case-sensitive'}, {matchingConfig.normalizeWhitespace ? 'Whitespace normalized' : 'Whitespace preserved'}</div>
          </div>
        </CardContent>
      </Card>
      
      {/* Results table */}
      <Card>
        <CardHeader>
          <CardTitle>Match Results</CardTitle>
          <CardDescription>
            Showing {Math.min(displayedRows, matchResults.length)} of {matchResults.length} rows
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matchResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No match results yet. Click "Start Matching" to begin.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Matched To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchResults.slice(0, displayedRows).map((result) => {
                    const rowData = rows[result.rowIndex] || {};
                    const partNumber = rowData[mappings['part_number'] || ''] || 'N/A';
                    const manufacturer = rowData[mappings['manufacturer'] || ''] || 'N/A';
                    
                    return (
                      <TableRow key={result.rowIndex}>
                        <TableCell className="font-mono">#{result.rowIndex + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(result.state)}
                            <span>{getStatusText(result.state)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{String(partNumber)}</TableCell>
                        <TableCell>{String(manufacturer)}</TableCell>
                        <TableCell>
                          <span className={getConfidenceColor(result.confidence)}>
                            {(result.confidence * 100).toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {result.matchedPartNumber ? (
                            <div className="space-y-1">
                              <div className="font-medium">{result.matchedPartNumber}</div>
                              {result.matchedManufacturer && (
                                <div className="text-sm text-muted-foreground">{result.matchedManufacturer}</div>
                              )}
                            </div>
                          ) : result.manualEntry ? (
                            <div className="space-y-1">
                              <div className="font-medium">{result.manualEntry.partNumber}</div>
                              <div className="text-sm text-muted-foreground">Manual entry</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {displayedRows < matchResults.length && (
                <div className="mt-4 text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setDisplayedRows(prev => prev + 10)}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}