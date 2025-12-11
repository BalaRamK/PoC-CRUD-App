import React, { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Toolbar, Typography, Box, IconButton, TableSortLabel, Chip, Menu, MenuItem,
  InputAdornment, Select, FormControl, InputLabel, Checkbox, ListItemText
} from "@mui/material";
// Import specific icons for actions and toolbar if needed (MoreVertIcon, etc.)
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MoreVertIcon from '@mui/icons-material/MoreVert'; // For consolidated actions
import FileDownloadIcon from '@mui/icons-material/FileDownload'; // For Export
import FilterListIcon from '@mui/icons-material/FilterList'; // For Filter
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import axios from 'axios';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import './ModernDialog.css'; // Import the new CSS file

const allColumns = [
  "PoC ID", "Customer Name", "PoC Title", "Sales Owner", "Delivery Lead",
  "Start Date", "End Date", "Estimated End Date", "Estimated Delivery Date", "Current Phase", "Status", "% Completion",
  "Next Milestone", "Current Blockers", "Comments"
];

const allKeys = [
  "pocId", "customer", "title", "salesOwner", "deliveryLead",
  "startDate", "endDate", "estimatedEndDate", "estimatedDeliveryDate", "phase", "status", "percent", "nextMilestone", "currentBlockers", "comments"
];

const initialVisibleColumns = [
  "pocId", "customer", "salesOwner", "deliveryLead",
  "startDate", "endDate", "estimatedEndDate", "estimatedDeliveryDate", "phase", "status", "percent"
];

const statusOptions = ['Completed', 'Delayed', 'On Track', 'Cancelled', 'Draft'];
const phaseOptions = ['Discovery', 'Design', 'Development', 'Testing', 'Deployment'];

// Helper for status chip styling
const getStatusChipProps = (status) => {
  const lowerStatus = String(status).toLowerCase();
  let color = 'default';
  let label = status;

  switch (lowerStatus) {
    case 'completed':
      color = 'success';
      label = 'Completed';
      break;
    case 'delayed':
      color = 'warning';
      label = 'Delayed';
      break;
    case 'on track':
    case 'execution':
    case 'in progress':
      color = 'primary'; // Use primary for 'On Track' / 'In Progress'
      label = status;
      break;
    case 'cancelled':
      color = 'error';
      label = 'Cancelled';
      break;
    case 'draft': // Inspired by billing image
      color = 'info';
      label = 'Draft';
      break;
    case 'unpaid': // Inspired by billing image
      color = 'warning';
      label = 'Unpaid';
      break;
    case 'past due': // Inspired by billing image
      color = 'error';
      label = 'Past due';
      break;
    case 'paid': // Inspired by billing image
      color = 'success';
      label = 'Paid';
      break;
    default:
      color = 'default';
      label = status;
  }
  return { color, label };
};

export default function DataTable({ onFilteredDataChange }) {
  const [rows, setRows] = useState([]); // Changed from initialRows
  const [open, setOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(null); // legacy - kept for compatibility
  const [editServerIdx, setEditServerIdx] = useState(null); // index used by backend (Excel row index)
  const [editArrayIdx, setEditArrayIdx] = useState(null); // index in local rows array for optimistic update
  const [form, setForm] = useState(allKeys.reduce((acc, key) => ({ ...acc, [key]: "" }), {}));
  const [searchText, setSearchText] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [filterStatus, setFilterStatus] = useState(() => new URLSearchParams(window.location.search).get('status') || '');
  const [filterDeliveryLead, setFilterDeliveryLead] = useState(() => new URLSearchParams(window.location.search).get('deliveryLead') || '');
  const [filterSalesOwner, setFilterSalesOwner] = useState(() => new URLSearchParams(window.location.search).get('salesOwner') || '');
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [orderBy, setOrderBy] = useState('pocId');
  const [order, setOrder] = useState('asc');
  const [searchParams, setSearchParams] = useSearchParams();
  const initPage = parseInt(searchParams.get('page') || '0', 10);
  const initRpp = parseInt(searchParams.get('rpp') || '10', 10);
  const [page, setPage] = useState(Number.isNaN(initPage) ? 0 : initPage);
  const [rowsPerPage, setRowsPerPage] = useState(Number.isNaN(initRpp) ? 10 : initRpp);
  const [loading, setLoading] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(initialVisibleColumns);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);

  // State for actions menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentActionRow, setCurrentActionRow] = useState(null);
  const openActionsMenu = Boolean(anchorEl);

  const handleMenuClick = (event, row) => {
    setAnchorEl(event.currentTarget);
    setCurrentActionRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setCurrentActionRow(null);
  };

  const handleColumnToggle = (key) => {
    setVisibleColumns(prev => 
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  function handleOpenAdd() {
    setForm(allKeys.reduce((acc, key) => ({ ...acc, [key]: "" }), {}));
    setEditIdx(null);
    setEditArrayIdx(null);
    setEditServerIdx(null);
    try { if (document && document.activeElement) document.activeElement.blur(); } catch (e) { }
    setOpen(true);
  }

  function handleOpenEdit(arg) {
    let row = null;
    let arrIdx = null;
    if (typeof arg === 'number') {
      arrIdx = arg;
      row = rows[arg];
    } else if (arg && typeof arg === 'object') {
      row = arg;
      arrIdx = rows.findIndex(r => (r.index ?? r.id) === (row.index ?? row.id));
    }
    if (!row) return;
    setForm({ ...row });
    setEditIdx(arrIdx); // Keep for title logic
    setEditArrayIdx(arrIdx);
    setEditServerIdx(row?.index ?? arrIdx);
    try { if (document && document.activeElement) document.activeElement.blur(); } catch (e) { }
    setOpen(true);
    handleMenuClose(); // Close menu if opened via menu
  }

  function handleOpenView(arg) {
    let row = null;
    if (typeof arg === 'number') row = rows[arg];
    else row = arg;
    if (!row) return;
    setViewRow(row);
    try { if (document && document.activeElement) document.activeElement.blur(); } catch (e) { }
    setViewOpen(true);
    handleMenuClose(); // Close menu if opened via menu
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSave() {
    const valuesArray = allKeys.map(k => form[k]);
    const updatedRow = allKeys.reduce((acc, k) => ({ ...acc, [k]: form[k] }), {});

    if (editArrayIdx === null) {
      // optimistic UI add
      const optimistic = { ...updatedRow, values: valuesArray, id: `local-${Date.now()}`, index: rows.length };
      setRows(prev => [...prev, optimistic]);
      axios.post('/api/items', { values: valuesArray })
        .then(() => fetchRows())
        .catch(err => {
          console.error('Add failed', err);
          fetchRows();
        });
    } else {
      // optimistic UI update for edit
      setRows(prev => {
        const copy = [...prev];
        const arrIdx = editArrayIdx ?? prev.findIndex(r => (r.index ?? r.id) === editServerIdx);
        const existing = copy[arrIdx] || {};
        copy[arrIdx] = { ...existing, ...updatedRow, values: valuesArray };
        return copy;
      });

      axios.patch(`/api/items/${editServerIdx}`, { values: valuesArray })
        .then(() => fetchRows())
        .catch(err => {
          console.error('Edit failed', err);
          fetchRows();
        });
    }
    setOpen(false);
  }

  async function fetchRows() {
    setLoading(true);
    try {
      const res = await axios.get('/api/items');
      let data = res?.data;
      if (data && data.success && data.data) data = data.data;
      if (!Array.isArray(data)) data = [];

      const normalized = data.map((item, idx) => {
        let values = [];
        if (Array.isArray(item.values)) {
          values = Array.isArray(item.values[0]) ? item.values[0] : item.values;
        } else if (Array.isArray(item)) {
          values = item;
        }

        // convert Excel serial dates to ISO for startDate/endDate if needed
        const excelSerialToISO = (n) => {
          const epoch = new Date(Date.UTC(1899, 11, 30));
          const ms = Math.round(n * 24 * 60 * 60 * 1000);
          const dt = new Date(epoch.getTime() + ms);
          return dt.toISOString();
        };
        values = values.map((v, i) => {
          const key = allKeys[i];
          if ((key === 'startDate' || key === 'endDate' || key === 'estimatedEndDate' || key === 'estimatedDeliveryDate') && typeof v === 'number') {
            return excelSerialToISO(v);
          }
          return v;
        });

        const mapped = allKeys.reduce((acc, key, i) => ({ ...acc, [key]: values[i] ?? '' }), {});

        // derive estimated delivery date if missing and project is past end date
        if (!mapped.estimatedDeliveryDate) {
          const today = dayjs();
          const endDateObj = mapped.endDate ? dayjs(mapped.endDate) : null;
          if (endDateObj && endDateObj.isValid() && endDateObj.isBefore(today, 'day')) {
            mapped.estimatedDeliveryDate = mapped.estimatedEndDate || mapped.endDate;
          }
        }

        return {
          id: item.id ?? idx,
          index: item.index ?? idx,
          values,
          ...mapped
        };
      });

      setRows(normalized);
    } catch (err) {
      console.error('Failed to fetch rows', err?.response?.data || err.message || err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
  }, []);

  useEffect(() => {
    setSearchParams({ page: String(page), rpp: String(rowsPerPage) }, { replace: true });
  }, [page, rowsPerPage, setSearchParams]);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    const newRpp = parseInt(event.target.value, 10);
    setRowsPerPage(newRpp);
    setPage(0);
  };

  const handleDelete = async (row) => {
    try {
      const targetIndex = row.index ?? row.id ?? rows.indexOf(row);
      await axios.delete(`/api/items/${targetIndex}`);
      await fetchRows();
    } catch (err) {
      console.error('Delete failed', err?.response?.data || err.message || err);
    }
    handleMenuClose(); // Close menu if opened via menu
  };

  // compute filtered rows for search and filters
  const filteredRows = rows.filter(r => {
    const s = searchText.trim().toLowerCase();
    if (s) {
      const hay = visibleColumns.map(k => String(r[k] ?? '').toLowerCase()).join(' ');
      if (!hay.includes(s)) return false;
    }
    if (filterStatus && String(r.status) !== String(filterStatus)) return false;
    if (filterDeliveryLead && String(r.deliveryLead) !== String(filterDeliveryLead)) return false;
    if (filterSalesOwner && String(r.salesOwner) !== String(filterSalesOwner)) return false;
    return true;
  });

  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredRows);
    }
  }, [filteredRows.length, searchText, filterStatus, filterDeliveryLead, filterSalesOwner]);

  // sorting helpers
  function descendingComparator(a, b, orderByKey) {
    const va = a[orderByKey] ?? '';
    const vb = b[orderByKey] ?? '';
    if (va === vb) return 0;
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    return (va < vb) ? -1 : 1;
  }

  function getComparator(ord, orderByKey) {
    return ord === 'desc'
      ? (a, b) => -descendingComparator(a, b, orderByKey)
      : (a, b) => descendingComparator(a, b, orderByKey);
  }

  function stableSort(array, comparator) {
    const stabilized = array.map((el, index) => [el, index]);
    stabilized.sort((a, b) => {
      const orderRes = comparator(a[0], b[0]);
      if (orderRes !== 0) return orderRes;
      return a[1] - b[1];
    });
    return stabilized.map(el => el[0]);
  }

  const sortedRows = stableSort(filteredRows, getComparator(order, orderBy));

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const renderFormInput = (key, i) => {
    const label = allColumns[i];
    
    if (['startDate','endDate','estimatedEndDate','estimatedDeliveryDate'].includes(key)) {
      return (
        <TextField
          key={key}
          name={key}
          label={label}
          type="date"
          value={form[key] ? dayjs(form[key]).format('YYYY-MM-DD') : ''}
          onChange={handleChange}
          variant="outlined"
          size="small"
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      );
    }

    if (key === 'status') {
      return (
        <FormControl fullWidth size="small" key={key}>
          <InputLabel>{label}</InputLabel>
          <Select
            name={key}
            value={form[key]}
            label={label}
            onChange={handleChange}
          >
            {statusOptions.map(option => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (key === 'phase') {
      return (
        <FormControl fullWidth size="small" key={key}>
          <InputLabel>{label}</InputLabel>
          <Select
            name={key}
            value={form[key]}
            label={label}
            onChange={handleChange}
          >
            {phaseOptions.map(option => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }
    
    if (key === 'percent') {
      return (
        <TextField
          key={key}
          name={key}
          label={label}
          type="number"
          value={form[key]}
          onChange={handleChange}
          variant="outlined"
          size="small"
          fullWidth
          InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>,
            inputProps: { min: 0, max: 100 }
          }}
        />
      );
    }

    return (
      <TextField
        key={key}
        name={key}
        label={label}
        value={form[key]}
        onChange={handleChange}
        variant="outlined"
        size="small"
        fullWidth
        multiline={key === 'comments'}
        minRows={key === 'comments' ? 3 : 1}
        placeholder={key === 'comments' ? 'Add date-stamped notes and wrap text as needed' : undefined}
      />
    );
  };

  return (
    <Box>
      <Toolbar sx={{
        px: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        mb: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, maxWidth: '100%' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mr: 2, color: 'var(--text-dark)' }}>
            PoC Delivery List
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant={filterStatus === '' ? 'contained' : 'outlined'}
              onClick={() => setFilterStatus('')}
              sx={{
                borderRadius: '8px', textTransform: 'none', px: 1.5, py: 0.5,
                bgcolor: filterStatus === '' ? 'var(--primary-orange)' : 'transparent',
                color: filterStatus === '' ? 'white' : 'var(--text-dark)',
                borderColor: 'var(--border-color)',
                '&:hover': {
                  bgcolor: filterStatus === '' ? 'var(--primary-orange-light)' : 'var(--secondary-gray)',
                  borderColor: 'var(--border-color)',
                }
              }}
            >
              All ({rows.length})
            </Button>
            {[...new Set(rows.map(r => r.status).filter(Boolean))].map(status => (
              <Button
                key={status}
                size="small"
                variant={filterStatus === status ? 'contained' : 'outlined'}
                onClick={() => setFilterStatus(status)}
                sx={{
                  borderRadius: '8px', textTransform: 'none', px: 1.5, py: 0.5,
                  bgcolor: filterStatus === status ? 'var(--primary-orange)' : 'transparent',
                  color: filterStatus === status ? 'white' : 'var(--text-dark)',
                  borderColor: 'var(--border-color)',
                  '&:hover': {
                    bgcolor: filterStatus === status ? 'var(--primary-orange-light)' : 'var(--secondary-gray)',
                    borderColor: 'var(--border-color)',
                  }
                }}
              >
                {status} ({rows.filter(r => r.status === status).length})
              </Button>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: { xs: 0, sm: 2 }, mt: { xs: 2, sm: 0 } }}>
          <IconButton onClick={(e) => setColumnMenuAnchor(e.currentTarget)}>
            <ViewColumnIcon />
          </IconButton>
          <Menu
            anchorEl={columnMenuAnchor}
            open={Boolean(columnMenuAnchor)}
            onClose={() => setColumnMenuAnchor(null)}
          >
            {allKeys.map((key, i) => (
              <MenuItem key={key} onClick={() => handleColumnToggle(key)}>
                <Checkbox checked={visibleColumns.includes(key)} />
                <ListItemText primary={allColumns[i]} />
              </MenuItem>
            ))}
          </Menu>
          <Button startIcon={<FileDownloadIcon />} variant="outlined" size="small" sx={{ textTransform: 'none', borderColor: 'var(--border-color)', color: 'var(--text-dark)', borderRadius: '8px' }}>
            Export
          </Button>
          <Button startIcon={<FilterListIcon />} variant="outlined" size="small" sx={{ textTransform: 'none', borderColor: 'var(--border-color)', color: 'var(--text-dark)', borderRadius: '8px' }}>
            Filter
          </Button>
          <Button startIcon={<AddIcon />} variant="contained" onClick={handleOpenAdd} sx={{
            backgroundColor: 'var(--primary-orange)', textTransform: 'none', borderRadius: '8px',
            '&:hover': { backgroundColor: 'var(--primary-orange-light)' }
          }}>
            Add Row
          </Button>
        </Box>
      </Toolbar>
      
      <TableContainer component={Paper} sx={{ mt: 1, overflow: 'auto', maxHeight: '65vh', borderRadius: 2, boxShadow: 'var(--shadow-light)' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'var(--secondary-gray)' }}>
            <TableRow>
              {allKeys.filter(key => visibleColumns.includes(key)).map((key) => {
                const col = allColumns[allKeys.indexOf(key)];
                return (
                  <TableCell key={key} sx={{
                    fontWeight: 600,
                    position: 'sticky',
                    top: 0,
                    backgroundColor: 'var(--secondary-gray)',
                    zIndex: 2,
                    fontSize: '0.9rem',
                    color: 'var(--text-dark)',
                    borderBottom: '1px solid var(--border-color)'
                  }}>
                    <TableSortLabel
                      active={orderBy === key}
                      direction={orderBy === key ? order : 'asc'}
                      onClick={() => handleRequestSort(key)}
                      sx={{ '& .MuiTableSortLabel-icon': { color: 'var(--text-light) !important' } }}
                    >
                      {col}
                    </TableSortLabel>
                  </TableCell>
                );
              })}
              <TableCell sx={{
                fontWeight: 600,
                position: 'sticky',
                top: 0,
                backgroundColor: 'var(--secondary-gray)',
                zIndex: 2,
                color: 'var(--text-dark)',
                borderBottom: '1px solid var(--border-color)'
              }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} align="center" sx={{ py: 3 }}>Loading...</TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} align="center" sx={{ py: 3 }}>No records found.</TableCell>
              </TableRow>
            ) : (
              sortedRows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, rIdx) => (
                  <TableRow key={row.id ?? rIdx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    {allKeys.filter(key => visibleColumns.includes(key)).map((k, cIdx) => (
                      <TableCell key={cIdx} sx={{
                        maxWidth: 200,
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        fontSize: '0.85rem',
                        color: 'var(--text-dark)',
                        borderBottom: '1px solid var(--border-color)'
                      }}>
                        {k === 'status' ? (
                          <Chip size="small" {...getStatusChipProps(row[k])} sx={{ borderRadius: '4px', height: '24px', fontSize: '0.75rem' }} />
                        ) : (['startDate','endDate','estimatedEndDate','estimatedDeliveryDate'].includes(k) && row[k]) ? (
                          dayjs(row[k]).isValid() ? dayjs(row[k]).format('DD MMM YYYY') : row[k]
                        ) : k === 'percent' && row[k] ? (
                          `${row[k]}%`
                        ) : row[k]}
                      </TableCell>
                    ))}
                    <TableCell sx={{ borderBottom: '1px solid var(--border-color)' }}>
                      <IconButton
                        aria-label="more"
                        id={`actions-menu-button-${row.id}`}
                        aria-controls={openActionsMenu ? `actions-menu-${row.id}` : undefined}
                        aria-expanded={openActionsMenu ? 'true' : undefined}
                        aria-haspopup="true"
                        onClick={(event) => handleMenuClick(event, row)}
                        size="small"
                        sx={{ color: 'var(--text-light)' }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                      <Menu
                        id={`actions-menu-${row.id}`}
                        MenuListProps={{ 'aria-labelledby': `actions-menu-button-${row.id}` }}
                        anchorEl={anchorEl}
                        open={openActionsMenu && currentActionRow && currentActionRow.id === row.id}
                        onClose={handleMenuClose}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                      >
                        <MenuItem onClick={() => handleOpenView(row)}><VisibilityIcon fontSize="small" sx={{ mr: 1 }} /> Check Next Milestone</MenuItem>
                        <MenuItem onClick={() => handleOpenView(row)}><VisibilityIcon fontSize="small" sx={{ mr: 1 }} /> Check Blocker</MenuItem>
                        <MenuItem onClick={() => handleOpenView(row)}><VisibilityIcon fontSize="small" sx={{ mr: 1 }} /> View</MenuItem>
                        <MenuItem onClick={() => handleOpenEdit(row)}><EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit</MenuItem>
                        <MenuItem onClick={() => handleDelete(row)} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete</MenuItem>
                      </Menu>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, alignItems: 'center' }}>
        <TablePagination
          component="div"
          count={filteredRows.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{
            '.MuiTablePagination-toolbar': { flexWrap: 'wrap' },
            '.MuiTablePagination-selectLabel, .MpiTablePagination-displayedRows': { color: 'var(--text-light)' },
            '.MuiTablePagination-select': { color: 'var(--primary-orange)' },
            '.MuiIconButton-root': { color: 'var(--text-light)' },
          }}
        />
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth={false} className="modern-dialog">
        <Box className="dialog-sidebar">
            <Box className="sidebar-header">
                <Typography variant="h5">{editIdx === null ? "Create New PoC" : "Edit PoC"}</Typography>
                <Typography variant="body1">
                    {editIdx === null
                        ? "Fill in the details below to add a new proof of concept to the tracker."
                        : `You are editing the PoC titled "${form.title || ''}".`
                    }
                </Typography>
            </Box>
            <Box className="sidebar-footer">
                <Typography variant="body2">Ensure all fields are accurate and up-to-date.</Typography>
            </Box>
        </Box>
        <Box className="dialog-main-content">
            <DialogTitle>{editIdx === null ? "Add Row" : "Edit Row"}</DialogTitle>
            <DialogContent>
                <Box className="dialog-form-grid">
                    {allKeys.map((key, i) => renderFormInput(key, i))}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpen(false)} variant="text">Cancel</Button>
                <Button onClick={handleSave} variant="contained" sx={{ backgroundColor: 'var(--primary-orange)', '&:hover': { backgroundColor: 'var(--primary-orange-light)' } }}>
                    Save
                </Button>
            </DialogActions>
        </Box>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth={false} className="modern-dialog">
          <Box className="dialog-sidebar">
              <Box className="sidebar-header">
                  <Typography variant="h5">PoC Details</Typography>
                  <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                      Viewing details for "{viewRow?.title || 'N/A'}"
                  </Typography>
              </Box>
              <Box className="sidebar-footer">
                  <Typography variant="body2">ID: {viewRow?.pocId || 'N/A'}</Typography>
              </Box>
          </Box>
          <Box className="dialog-main-content">
              <DialogTitle>View Full Details</DialogTitle>
              <DialogContent>
                  <Box className="view-details-grid">
                      {allKeys.map((k, i) => (
                          <Box key={k} className="view-detail-item">
                              <Typography className="view-detail-item-label">{allColumns[i]}</Typography>
                              <Typography className="view-detail-item-value">
                                    {k === 'status' ? (
                                      <Chip size="small" {...getStatusChipProps(viewRow?.[k])} />
                                    ) : (['startDate','endDate','estimatedEndDate','estimatedDeliveryDate'].includes(k) && viewRow?.[k]) ? (
                                      dayjs(viewRow[k]).isValid() ? dayjs(viewRow[k]).format('DD MMM YYYY') : viewRow[k]
                                    ) : k === 'percent' && viewRow?.[k] ? (
                                      `${viewRow[k]}%`
                                    ) : k === 'comments' ? (
                                      <Box sx={{ whiteSpace: 'pre-wrap' }}>{viewRow?.[k] || 'Not available'}</Box>
                                    ) : viewRow?.[k] ?? 'Not available'}
                              </Typography>
                          </Box>
                      ))}
                  </Box>
              </DialogContent>
              <DialogActions>
                  <Button onClick={() => setViewOpen(false)} variant="contained" sx={{ backgroundColor: 'var(--primary-orange)', '&:hover': { backgroundColor: 'var(--primary-orange-light)' } }}>Close</Button>
              </DialogActions>
          </Box>
      </Dialog>
    </Box>
  );
}
