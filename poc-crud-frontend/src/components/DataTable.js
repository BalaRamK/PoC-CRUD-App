import React, { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination,
  Button as MUIButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Toolbar, Typography, Box, IconButton, TableSortLabel, Chip, Menu, MenuItem,
  InputAdornment, Select, FormControl, InputLabel, Checkbox, ListItemText,
  Autocomplete, Avatar, CircularProgress
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
import { Button as UIButton } from './ui/button';
import axios from 'axios';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import './ModernDialog.css'; // Import the new CSS file
import { useAuth } from '../auth/AuthProvider';

const allColumns = [
  "PoC ID", "Customer Name", "PoC Title", "Sales Owner", "Delivery Lead",
  "Start Date", "Actual End Date", "Estimated End Date", "Current Phase", "Status", "% Completion",
  "Next Milestone", "Current Blockers", "Comments"
];

const allKeys = [
  "pocId", "customer", "title", "salesOwner", "deliveryLead",
  "startDate", "endDate", "estimatedEndDate", "phase", "status", "percent", "nextMilestone", "currentBlockers", "comments"
];

const initialVisibleColumns = [
  "pocId", "customer", "salesOwner", "deliveryLead",
  "startDate", "endDate", "estimatedEndDate", "phase", "status", "percent"
];

const statusOptions = ['On Track', 'Delayed', 'Completed', 'On Hold'];
const phaseOptions = ['Delivery Initiation', 'Planning & Setup', 'Execution', 'Evaluation', 'Closure'];

// Helper to auto-calculate % completion based on phase
const calculatePercentByPhase = (phase) => {
  const phaseMap = {
    'Delivery Initiation': 20,
    'Planning & Setup': 40,
    'Execution': 60,
    'Evaluation': 80,
    'Closure': 100
  };
  return phaseMap[phase] || 0;
};

// Helper to auto-calculate if status should be delayed
// Use planned (estimated) end date for delay calculation, but never override "On Hold"
const calculateStatus = (estimatedEndDate, currentStatus) => {
  const lower = String(currentStatus).toLowerCase();
  if (lower === 'completed') return 'Completed';
  if (lower === 'on hold') return 'On Hold';
  const end = dayjs(estimatedEndDate);
  if (end.isValid() && end.isBefore(dayjs(), 'day')) {
    return 'Delayed';
  }
  return currentStatus || 'On Track';
};

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
      color = 'info';
      label = 'On Track';
      break;
    case 'on hold':
      color = 'secondary';
      label = 'On Hold';
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

  // AAD people picker state
  const { getToken } = useAuth();
  const [userOptions, setUserOptions] = useState([]);
  const [userLoading, setUserLoading] = useState(false);

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
    const newForm = allKeys.reduce((acc, key) => ({ ...acc, [key]: "" }), {});
    // Auto-increment POC ID
    if (rows.length > 0) {
      const maxId = Math.max(...rows.map(r => {
        const id = String(r.pocId || '').replace(/[^0-9]/g, '');
        return id ? parseInt(id, 10) : 0;
      }));
      newForm.pocId = String((maxId + 1) || 1);
    } else {
      newForm.pocId = '1';
    }
    setForm(newForm);
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

  function handleEditFromView() {
    if (!viewRow) return;
    setViewOpen(false);
    const arrIdx = rows.findIndex(r => (r.index ?? r.id) === (viewRow.index ?? viewRow.id));
    setEditArrayIdx(arrIdx);
    setEditServerIdx(viewRow.index ?? viewRow.id);
    setEditIdx(arrIdx);
    setForm({ ...viewRow });
    setOpen(true);
  }

  function handleDeleteFromView() {
    if (!viewRow) return;
    setViewOpen(false);
    handleDelete(viewRow);
  }

  // Fetch AAD users for autocomplete
  async function fetchAADUsers(searchText) {
    if (!searchText || searchText.length < 2) {
      setUserOptions([]);
      return;
    }
    setUserLoading(true);
    try {
      const token = await getToken();
      const encodedSearch = encodeURIComponent(`"${searchText}"`);
      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/users?$filter=startsWith(displayName,'${searchText}') or startsWith(mail,'${searchText}')&$top=10`,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            ConsistencyLevel: 'eventual'
          } 
        }
      );
      const users = response.data.value?.map(u => ({
        id: u.id,
        displayName: u.displayName || u.mail,
        mail: u.mail,
        photo: u.id
      })) || [];
      setUserOptions(users);
    } catch (err) {
      console.error('Error fetching AAD users:', err);
      setUserOptions([]);
    } finally {
      setUserLoading(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSave() {
    // Auto-calculate delayed status based on planned end date
    const calculatedStatus = calculateStatus(form.estimatedEndDate, form.status);
    const formWithCalculatedStatus = { ...form, status: calculatedStatus };
    
    const valuesArray = allKeys.map(k => formWithCalculatedStatus[k]);
    const updatedRow = allKeys.reduce((acc, k) => ({ ...acc, [k]: formWithCalculatedStatus[k] }), {});

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

      console.log('Raw data from backend:', data.slice(0, 2)); // Log first 2 rows
      
      const normalized = data.map((item, idx) => {
        let values = [];
        if (Array.isArray(item.values)) {
          values = Array.isArray(item.values[0]) ? item.values[0] : item.values;
        } else if (Array.isArray(item)) {
          values = item;
        }

        console.log(`Row ${idx} - values length: ${values.length}, expected: ${allKeys.length}`);
        if (idx === 0) {
          console.log('First row values:', values);
          console.log('Expected keys:', allKeys);
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
          if ((key === 'startDate' || key === 'endDate' || key === 'estimatedEndDate') && typeof v === 'number') {
            return excelSerialToISO(v);
          }
          return v;
        });

        // Support both array-of-values and object-shaped payloads
        const mapped = allKeys.reduce((acc, key, i) => ({
          ...acc,
          [key]: values[i] ?? item[key] ?? ''
        }), {});

        return {
          id: item.id ?? idx,
          index: item.index ?? idx,
          values,
          ...mapped
        };
      });

      const cleaned = normalized.filter(row =>
        allKeys.some(key => String(row[key] ?? '').trim() !== '')
      );

      setRows(cleaned);
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

  // Sync filter states with URL params
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const deliveryLeadParam = searchParams.get('deliveryLead');
    const salesOwnerParam = searchParams.get('salesOwner');
    const qParam = searchParams.get('q');
    
    if (statusParam !== null && statusParam !== filterStatus) {
      setFilterStatus(statusParam);
    }
    if (deliveryLeadParam !== null && deliveryLeadParam !== filterDeliveryLead) {
      setFilterDeliveryLead(deliveryLeadParam);
    }
    if (salesOwnerParam !== null && salesOwnerParam !== filterSalesOwner) {
      setFilterSalesOwner(salesOwnerParam);
    }
    if (qParam !== null && qParam !== searchText) {
      setSearchText(qParam);
    }
  }, [searchParams]);

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
    
    if (key === 'pocId') {
      return (
        <TextField
          key={key}
          label={label}
          value={form[key] ?? ''}
          disabled
          fullWidth
          variant="outlined"
          size="small"
        />
      );
    }

    if (key === 'salesOwner' || key === 'deliveryLead') {
      const val = form[key] ?? '';
      return (
        <Autocomplete
          key={key}
          options={userOptions}
          getOptionLabel={(opt) => typeof opt === 'string' ? opt : (opt.displayName || '')}
          value={val ? (typeof val === 'string' ? val : val.displayName || val) : null}
          onInputChange={(e, v) => fetchAADUsers(v)}
          onChange={(e, v) => setForm({ ...form, [key]: v ? (typeof v === 'string' ? v : v.displayName) : '' })}
          loading={userLoading}
          renderOption={(props, option) => (
            <Box {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', backgroundColor: 'var(--primary-orange)' }}>
                {option.displayName?.charAt(0) || 'U'}
              </Avatar>
              <Box>
                <Typography variant="body2">{option.displayName}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{option.mail}</Typography>
              </Box>
            </Box>
          )}
          fullWidth
          variant="outlined"
          size="small"
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {userLoading && <CircularProgress color="inherit" size={20} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      );
    }
    
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
      const calculatedStatus = calculateStatus(form.estimatedEndDate, form.status);
      const lowerStatus = String(calculatedStatus).toLowerCase();
      const isCompleted = lowerStatus === 'completed';
      const isDelayed = lowerStatus === 'delayed';

      // If completed, lock the field
      if (isCompleted) {
        return (
          <FormControl fullWidth size="small" key={key}>
            <InputLabel>{label}</InputLabel>
            <Select name={key} value="Completed" label={label} disabled>
              <MenuItem value="Completed">Completed</MenuItem>
            </Select>
          </FormControl>
        );
      }

      // If auto-delayed, allow moving to On Hold or Completed (not back to delayed)
      if (isDelayed) {
        return (
          <FormControl fullWidth size="small" key={key}>
            <InputLabel>{label}</InputLabel>
            <Select
              name={key}
              value={form.status || 'Delayed'}
              label={label}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'Completed' || val === 'On Hold') {
                  handleChange({ target: { name: 'status', value: val } });
                }
              }}
            >
              <MenuItem value="Delayed">Delayed (from planned end date)</MenuItem>
              <MenuItem value="On Hold">On Hold</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
            </Select>
          </FormControl>
        );
      }

      // Default: allow On Track / On Hold / Completed
      return (
        <FormControl fullWidth size="small" key={key}>
          <InputLabel>{label}</InputLabel>
          <Select
            name={key}
            value={form.status || 'On Track'}
            label={label}
            onChange={(e) => {
              const val = e.target.value;
              if (['On Track', 'On Hold', 'Completed'].includes(val)) {
                handleChange({ target: { name: 'status', value: val } });
              }
            }}
          >
            <MenuItem value="On Track">On Track</MenuItem>
            <MenuItem value="On Hold">On Hold</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
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
            onChange={(e) => {
              const phase = e.target.value;
              const autoPercent = calculatePercentByPhase(phase);
              setForm({ ...form, phase, percent: String(autoPercent) });
            }}
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
          <MUIButton startIcon={<FileDownloadIcon />} variant="outlined" size="small" sx={{ textTransform: 'none', borderColor: 'var(--border-color)', color: 'var(--text-dark)', borderRadius: '8px' }}>
            Export
          </MUIButton>
          <MUIButton startIcon={<FilterListIcon />} variant="outlined" size="small" sx={{ textTransform: 'none', borderColor: 'var(--border-color)', color: 'var(--text-dark)', borderRadius: '8px' }}>
            Filter
          </MUIButton>
          <UIButton onClick={handleOpenAdd} className="bg-[var(--primary-orange)] text-white">
            Add Row
          </UIButton>
        </Box>
      </Toolbar>
      
      <TableContainer component={Paper} sx={{ mt: 1, overflow: 'auto', maxHeight: '65vh', borderRadius: 2, boxShadow: 'var(--shadow-light)' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'var(--secondary-gray)' }}>
            <TableRow>
              {(() => {
                // Compute display order: swap 'endDate' and 'estimatedEndDate' visually
                const keysToShow = allKeys.filter(key => visibleColumns.includes(key));
                const iEnd = keysToShow.indexOf('endDate');
                const iEst = keysToShow.indexOf('estimatedEndDate');
                if (iEnd !== -1 && iEst !== -1) {
                  [keysToShow[iEnd], keysToShow[iEst]] = [keysToShow[iEst], keysToShow[iEnd]];
                }
                return keysToShow.map((key) => {
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
                });
              })()}
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
                    {(() => {
                      const keysToShow = allKeys.filter(key => visibleColumns.includes(key));
                      const iEnd = keysToShow.indexOf('endDate');
                      const iEst = keysToShow.indexOf('estimatedEndDate');
                      if (iEnd !== -1 && iEst !== -1) {
                        [keysToShow[iEnd], keysToShow[iEst]] = [keysToShow[iEst], keysToShow[iEnd]];
                      }
                      return keysToShow.map((k, cIdx) => (
                      <TableCell key={cIdx} sx={{
                        maxWidth: 220,
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        fontSize: '0.85rem',
                        color: 'var(--text-dark)',
                        borderBottom: '1px solid var(--border-color)',
                        textAlign: k === 'customer' ? 'center' : 'left'
                      }}>
                        {k === 'status' ? (
                          <Chip size="small" {...getStatusChipProps(row[k])} sx={{ borderRadius: '4px', height: '24px', fontSize: '0.75rem' }} />
                        ) : k === 'customer' ? (
                          <Button
                            variant="text"
                            size="small"
                            onClick={() => handleOpenView(row)}
                            sx={{
                              textTransform: 'none',
                              color: 'var(--primary-orange)',
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              px: 0,
                              display: 'block',
                              width: '100%',
                              '&:hover': { textDecoration: 'underline', background: 'transparent' }
                            }}
                          >
                            {row[k] || 'N/A'}
                          </Button>
                        ) : (['startDate','endDate','estimatedEndDate'].includes(k) && row[k]) ? (
                          dayjs(row[k]).isValid() ? dayjs(row[k]).format('DD MMM YYYY') : row[k]
                        ) : k === 'percent' && row[k] ? (
                          `${row[k]}%`
                        ) : row[k]}
                      </TableCell>
                      ));
                    })()}
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
        <Box className="dialog-main-content">
            <DialogTitle>{editIdx === null ? "Add Row" : "Edit Row"}</DialogTitle>
            <DialogContent>
                <Box className="dialog-form-grid">
                    {allKeys.map((key, i) => renderFormInput(key, i))}
                </Box>
            </DialogContent>
            <DialogActions>
              <MUIButton onClick={() => setOpen(false)} variant="text">Cancel</MUIButton>
              <UIButton onClick={handleSave} className="bg-[var(--primary-orange)] text-white">Save</UIButton>
            </DialogActions>
        </Box>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth={false} className="modern-dialog">
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
              <DialogActions sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 2 }}>
                  <Button onClick={() => setViewOpen(false)} variant="text" sx={{ color: 'var(--text-dark)' }}>Close</Button>
                  <UIButton onClick={handleEditFromView} className="bg-[var(--primary-orange)] text-white">Edit</UIButton>
                  <UIButton onClick={handleDeleteFromView} className="bg-red-600 text-white">Delete</UIButton>
              </DialogActions>
          </Box>
      </Dialog>
    </Box>
  );
}
