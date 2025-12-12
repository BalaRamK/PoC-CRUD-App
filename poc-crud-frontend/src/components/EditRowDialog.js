import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Grid
} from "@mui/material";
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from "dayjs";
import axios from "axios";

const columns = [
  "PoC ID", "Customer Name", "PoC Title", "Sales Owner", "Delivery Lead",
  "Start Date", "End Date", "Estimated End Date", "Current Phase", "Status", "% Completion",
  "Next Milestone", "Current Blockers", "Comments"
];

export default function EditRowDialog({ open, initialValues, onClose, rowIndex, onSaved }) {
  const [fields, setFields] = useState(Array(columns.length).fill(""));

  useEffect(() => {
    if (initialValues)
      setFields([...initialValues]);
  }, [initialValues]);

  const handleChange = (idx, value) => {
    const updated = [...fields];
    updated[idx] = value;
    setFields(updated);
  };

  const handleSave = async () => {
    const payload = [
      fields[0], fields[1], fields[2], fields[3], fields[4],
      fields[5] && dayjs(fields[5]).isValid() ? dayjs(fields[5]).format("YYYY-MM-DD") : "",
      fields[6] && dayjs(fields[6]).isValid() ? dayjs(fields[6]).format("YYYY-MM-DD") : "",
      fields[7] && dayjs(fields[7]).isValid() ? dayjs(fields[7]).format("YYYY-MM-DD") : "",
      fields[8], fields[9], fields[10], fields[11], fields[12], fields[13]
    ];
    try {
      await axios.patch(`/api/items/${rowIndex}`, { values: payload });
      onSaved();
      onClose();
    } catch (err) {
      alert("Edit error: " + (err?.response?.data || err.message));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Row</DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Grid container spacing={2}>
            {columns.map((col, idx) => (
              <Grid item xs={12} sm={6} md={4} key={col}>
                {[5,6,7,8].includes(idx) ? (
                  <DatePicker
                    label={col}
                    value={fields[idx] ? dayjs(fields[idx]) : null}
                    onChange={date => handleChange(idx, date)}
                    textField={
                      <TextField
                        fullWidth
                        margin="dense"
                        variant="outlined"
                      />
                    }
                  />
                ) : (
                  <TextField
                    label={col}
                    value={fields[idx]}
                    onChange={e => handleChange(idx, e.target.value)}
                    fullWidth
                    margin="dense"
                    variant="outlined"
                    multiline={col === 'Comments'}
                    minRows={col === 'Comments' ? 3 : 1}
                    placeholder={col === 'Comments' ? 'Add date, notes, and wrap text as needed' : undefined}
                  />
                )}
              </Grid>
            ))}
          </Grid>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
