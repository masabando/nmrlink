# -*- coding: utf-8 -*-
import tkinter as tk
from tkinter import ttk
from tkinter import scrolledtext
import serial
import serial.tools.list_ports
import struct
import os
import datetime 
import time
from os.path import expanduser

# Lightweight alternative to matplotlib
from PIL import Image, ImageDraw

class NotificationWindow:
    def __init__(self, parent):
        self.win = tk.Toplevel(parent)
        self.win.title("Real-time Status Monitor")
        self.win.geometry("500x400")
        self.win.attributes('-topmost', True)
        
        self.txt = scrolledtext.ScrolledText(self.win, wrap=tk.WORD, bg="#1e1e1e", fg="#d4d4d4", font=("Consolas", 10))
        self.txt.pack(fill=tk.BOTH, expand=True)
        self.txt.config(state=tk.DISABLED)
        self.win.protocol("WM_DELETE_WINDOW", self.hide_window)

    def log(self, log_type, message):
        now_str = datetime.datetime.now().strftime('%H:%M:%S')
        full_msg = f"[{now_str}] [{log_type}] {message}\n"
        
        self.txt.config(state=tk.NORMAL)
        self.txt.insert(tk.END, full_msg)
        
        if log_type == "ERROR":
            self.txt.tag_add("error", "end-2l", "end-1c")
            self.txt.tag_config("error", foreground="#ff6b6b")
        elif log_type == "WARN":
            self.txt.tag_add("warn", "end-2l", "end-1c")
            self.txt.tag_config("warn", foreground="#f1fa8c")
        elif log_type == "INFO":
            self.txt.tag_add("info", "end-2l", "end-1c")
            self.txt.tag_config("info", foreground="#50fa7b")
            
        self.txt.config(state=tk.DISABLED)
        self.txt.see(tk.END)

    def hide_window(self):
        self.win.withdraw()

    def show_window(self):
        self.win.deiconify()
        self.win.attributes('-topmost', True)


class SerialGuiApp:
    def __init__(self, root):
        self.root = root
        self.root.title("NMR Parameter Config & Data Logger")
        self.root.geometry("1150x750")
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
        self.D_N = 2048  
        self.BauR = 115200
        
        self.canvas_width = 450
        self.canvas_height = 350
        self.save_dir = os.path.join(expanduser('~'), 'Desktop', 'S')
        
        self.ser = None 
        self.last_data1 = []
        self.last_data2 = []
        self.last_title = ""
        
        self.monitor = NotificationWindow(self.root)
        self.create_widgets()
        self.init_serial()
        
    def on_closing(self):
        """アプリ終了時にシリアルポートを確実に閉じる"""
        if self.ser and self.ser.is_open:
            try:
                self.ser.close()
                self.write_log("INFO", "Serial port closed safely on exit.")
            except Exception as e:
                print(f"Error closing port: {e}")
                
        # 通知ウィンドウも破棄して本体を終了
        if hasattr(self, 'monitor') and self.monitor.win:
            self.monitor.win.destroy()
        self.root.destroy()
        
    def init_serial(self):
        com_port = self.port_combobox.get()
        try:
            if self.ser and self.ser.is_open:
                self.ser.close()
            self.ser = serial.Serial(com_port, self.BauR, timeout=5)
            self.write_log("INFO", f"Successfully connected to {com_port}")
            self.status_label.config(text="Connected", fg="green")
        except Exception as e:
            self.write_log("ERROR", f"Failed to open {com_port}: {str(e)}")
            self.status_label.config(text="Disconn.", fg="red")

    def write_log(self, log_type, message):
        self.monitor.log(log_type, message)
        try:
            if not os.path.exists(self.save_dir):
                os.makedirs(self.save_dir)
            log_path = os.path.join(self.save_dir, 'log.txt')
            now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            clean_message = message.replace('\n', ' | ')
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(f"[{now_str}] [{log_type}] {clean_message}\n")
        except Exception as e:
            print(f"Failed to write log file: {e}")

    def create_widgets(self):
        # --- 1. Communication Settings ---
        config_frame = tk.LabelFrame(self.root, text="Communication Settings")
        config_frame.pack(side=tk.TOP, fill=tk.X, padx=10, pady=5)
        
        tk.Label(config_frame, text="COM Port:").pack(side=tk.LEFT, padx=5, pady=5)
        
        ports = [port.device for port in serial.tools.list_ports.comports()]
        self.port_combobox = ttk.Combobox(config_frame, values=ports, width=15)
        self.port_combobox.pack(side=tk.LEFT, padx=5, pady=5)
        if ports:
            self.port_combobox.current(0)
        else:
            self.port_combobox.set("COM13")
            
        tk.Button(config_frame, text="Connect", command=self.init_serial).pack(side=tk.LEFT, padx=5, pady=5)
        tk.Button(config_frame, text="Open Monitor Window", command=self.monitor.show_window).pack(side=tk.LEFT, padx=10, pady=5)
            
        self.status_label = tk.Label(config_frame, text="Disconnected", fg="red", font=("Arial", 10, "bold"))
        self.status_label.pack(side=tk.RIGHT, padx=15, pady=5)

# --- 2. NMR Parameter Settings & Plot Scale Settings ---
        param_frame = tk.LabelFrame(self.root, text="NMR Parameter & Plot Scale Settings")
        param_frame.pack(side=tk.TOP, fill=tk.X, padx=10, pady=5)
        
        items = [
            ("Frequency [Hz]:", "402000", "entry_frH"),
            ("Pulse Width 1 :", "60", "entry_pw1"),
            ("Pulse Phase 1 :", "0", "combobox_pp1"),
            ("Pulse Interval [ms]:", "5", "entry_p_int"),
            ("Meas. Interval [ms]:", "200", "entry_m_int"),
            ("Pulse Width 2 :", "120", "entry_pw2"),
            ("Pulse Phase 2 :", "90", "combobox_pp2"),
            ("Meas. Count (MEAS_N):", "128", "entry_meas_n")
        ]
        
        self.entries = {}
        for idx, (label_text, default_val, var_name) in enumerate(items):
            row = idx // 4
            col = (idx % 4) * 2
            tk.Label(param_frame, text=label_text).grid(row=row, column=col, padx=5, pady=5, sticky="e")
            if var_name in ["combobox_pp1", "combobox_pp2"]:
                widget = ttk.Combobox(param_frame, values=["0", "90", "180", "270"], width=8, state="readonly")
                widget.set(default_val)
            else:
                widget = tk.Entry(param_frame, width=10)
                widget.insert(0, default_val)
            widget.grid(row=row, column=col+1, padx=5, pady=5, sticky="w")
            self.entries[var_name] = widget

        # --- Plot Scale Settings ---
        tk.Label(param_frame, text="Y-Max:").grid(row=0, column=8, padx=5, pady=5, sticky="e")
        self.entry_ymax = tk.Entry(param_frame, width=7)
        self.entry_ymax.insert(0, "2000")
        self.entry_ymax.grid(row=0, column=9, padx=2, pady=5, sticky="w")
        
        tk.Label(param_frame, text="Y-Min:").grid(row=1, column=8, padx=5, pady=5, sticky="e")
        self.entry_ymin = tk.Entry(param_frame, width=7)
        self.entry_ymin.insert(0, "-2000")
        self.entry_ymin.grid(row=1, column=9, padx=2, pady=5, sticky="w")

        tk.Label(param_frame, text="X-Min [ms]:").grid(row=0, column=10, padx=5, pady=5, sticky="e")
        self.entry_xmin_time = tk.Entry(param_frame, width=7)
        self.entry_xmin_time.insert(0, "0.0")
        self.entry_xmin_time.grid(row=0, column=11, padx=2, pady=5, sticky="w")
        
        tk.Label(param_frame, text="X-Max [ms]:").grid(row=1, column=10, padx=5, pady=5, sticky="e")
        self.entry_xmax_time = tk.Entry(param_frame, width=7)
        self.entry_xmax_time.insert(0, "41.0")
        self.entry_xmax_time.grid(row=1, column=11, padx=2, pady=5, sticky="w")

        # ★ ボタンの配置修正: Send Parameters を Update Plot の真上（row=0, column=12）に配置
        self.send_param_button = tk.Button(param_frame, text="Send Parameters", command=self.send_parameters, bg="orange", fg="black", font=("Arial", 9, "bold"))
        self.send_param_button.grid(row=0, column=12, padx=10, pady=5, sticky="ew")

        self.update_scale_button = tk.Button(param_frame, text="Update Plot", command=self.replot_current_data, bg="lightgreen", font=("Arial", 9, "bold"))
        self.update_scale_button.grid(row=1, column=12, padx=10, pady=5, sticky="ew")


        # --- 3. Sequence Control Section ---
        sequence_frame = tk.LabelFrame(self.root, text="Sequence Control")
        sequence_frame.pack(side=tk.TOP, fill=tk.X, padx=10, pady=5)
        
        def on_click_s():
            try:
                m_int_val = int(self.entries["entry_m_int"].get())
                meas_n_val = int(self.entries["entry_meas_n"].get())
                self.run_wait_command(b's\r\n', m_int_val, meas_n_val)
            except ValueError:
                self.write_log("WARN", "Interval / Count values must be integers.")

        def on_click_d():
            try:
                m_int_val = int(self.entries["entry_m_int"].get())
                meas_n_val = int(self.entries["entry_meas_n"].get())
                self.run_wait_command(b'd\r\n', m_int_val, meas_n_val)
            except ValueError:
                self.write_log("WARN", "Interval / Count values must be integers.")
        
        self.s_button = tk.Button(sequence_frame, text="single pulse", command=on_click_s, bg="brown", fg="white", font=("Arial", 10, "bold"), width=15)        
        self.s_button.pack(side=tk.LEFT, padx=10, pady=5)
        self.d_button = tk.Button(sequence_frame, text="double pulses", command=on_click_d, bg="brown", fg="white", font=("Arial", 10, "bold"), width=15)
        self.d_button.pack(side=tk.LEFT, padx=10, pady=5)
        
        self.progress = ttk.Progressbar(sequence_frame, orient="horizontal", length=300, mode="determinate")
        self.progress.pack(side=tk.LEFT, padx=20, pady=5)
        self.countdown_label = tk.Label(sequence_frame, text="", font=("Arial", 10, "bold"))
        self.countdown_label.pack(side=tk.LEFT, padx=5, pady=5)

        # --- 4. Plot Canvas ---
        graph_frame = tk.LabelFrame(self.root, text="Graph View", bg="black", fg="white")
        graph_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        self.canvas = tk.Canvas(graph_frame, bg="black", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)
        
        def on_resize(event):
            self.canvas_width = event.width
            self.canvas_height = event.height
            self.draw_placeholder()
        self.canvas.bind("<Configure>", on_resize)

    def set_gui_state(self, state):
        self.send_param_button.config(state=state)
        self.s_button.config(state=state)
        self.d_button.config(state=state)

    def draw_placeholder(self, title="No Data"):
        self.canvas.delete("all")
        self.canvas.create_text(self.canvas_width/2, self.canvas_height/2, text=title, fill="white", font=("Arial", 12))

    def draw_graph(self, title, data1, data2):
        self.canvas.delete("all")
        w, h = self.canvas_width, self.canvas_height
        
        self.last_data1 = data1
        self.last_data2 = data2
        self.last_title = title
        
        pil_img = Image.new("RGB", (w, h), "black")
        draw = ImageDraw.Draw(pil_img)
        
        self.canvas.create_text(w/2, 20, text=title, fill="white", font=("Arial", 12, "bold"))
        draw.text((w/2 - 30, 10), title, fill="white")
        
        try:
            y_max = float(self.entry_ymax.get())
            y_min = float(self.entry_ymin.get())
        except ValueError:
            y_max, y_min = 2000.0, -2000.0
            
        try:
            x_min_t = float(self.entry_xmin_time.get())
            x_max_t = float(self.entry_xmax_time.get())
            if x_min_t >= x_max_t:
                x_min_t, x_max_t = 0.0, 41.0
        except ValueError:
            x_min_t, x_max_t = 0.0, 41.0
            
        plot_pad_bottom = 60 
        x_start, x_end = 20, w - 20
        
        def to_coords(data):
            coords = []
            for i, val in enumerate(data):
                current_time = (i / (self.D_N - 1)) * 41.0
                
                if x_max_t == x_min_t:
                    continue
                x_ratio = (current_time - x_min_t) / (x_max_t - x_min_t)
                
                x = x_start + x_ratio * (x_end - x_start)
                norm_y = max(0.0, min(1.0, (val - y_min) / (y_max - y_min)))
                y = (h - plot_pad_bottom) - (norm_y * (h - 60 - plot_pad_bottom) + 20)
                
                if -50 <= x <= w + 50:
                    coords.append((x, y))
            return coords

        if len(data1) > 1:
            coords1, coords2 = to_coords(data1), to_coords(data2)
            if len(coords2) > 1:
                self.canvas.create_line([c for pt in coords2 for c in pt], fill="cyan", width=1)
                draw.line(coords2, fill="cyan", width=1)
            if len(coords1) > 1:
                self.canvas.create_line([c for pt in coords1 for c in pt], fill="yellow", width=1)
                draw.line(coords1, fill="yellow", width=1)
            
        y_axis = h - plot_pad_bottom + 20 
        self.canvas.create_line(x_start, y_axis, x_end, y_axis, fill="white", width=1)
        draw.line([(x_start, y_axis), (x_end, y_axis)], fill="white", width=1)
        
        all_possible_ticks = [0.0, 5.0, 10.0, 15.0, 20.0, 25.0, 30.0, 35.0, 40.0, 41.0]
        
        for t_val in all_possible_ticks:
            if x_min_t <= t_val <= x_max_t:
                ratio = (t_val - x_min_t) / (x_max_t - x_min_t)
                x_pos = x_start + ratio * (x_end - x_start)
                
                label = f"{t_val} ms"
                
                self.canvas.create_line(x_pos, y_axis, x_pos, y_axis + 5, fill="white", width=1)
                draw.line([(x_pos, y_axis), (x_pos, y_axis + 5)], fill="white", width=1)
                
                offset_x = 18 if t_val == 41.0 else 10
                self.canvas.create_text(x_pos, y_axis + 18, text=label, fill="gray", font=("Arial", 9))
                draw.text((x_pos - offset_x, y_axis + 10), label, fill="gray")
            
        self.canvas.create_rectangle(w-90, 15, w-80, 25, fill="yellow", outline="")
        self.canvas.create_text(w-55, 20, text="Data 1", fill="white", font=("Arial", 9))
        self.canvas.create_rectangle(w-90, 30, w-80, 40, fill="cyan", outline="")
        self.canvas.create_text(w-55, 35, text="Data 2", fill="white", font=("Arial", 9))
        
        draw.rectangle([w-90, 15, w-80, 25], fill="yellow")
        draw.text((w-75, 13), "Data 1", fill="white")
        draw.rectangle([w-90, 30, w-80, 40], fill="cyan")
        draw.text((w-75, 28), "Data 2", fill="white")
        
        return pil_img

    def replot_current_data(self):
        if hasattr(self, 'last_data1') and len(self.last_data1) > 0:
            self.draw_graph(self.last_title, self.last_data1, self.last_data2)
            self.write_log("INFO", "Graph scale updated manually.")
        else:
            self.write_log("WARN", "No data available to re-plot.")

    def run_wait_command(self, cmd_bytes, m_int, meas_n):
        if not self.ser or not self.ser.is_open:
            self.write_log("ERROR", "Serial port is not open.")
            return
        
        cmd_char = cmd_bytes.decode('utf-8').strip()
        self.set_gui_state(tk.DISABLED)
        self.status_label.config(text=f"Executing '{cmd_char}'...", fg="purple")
        self.root.update()
        
        success = False
        try:
            self.ser.reset_input_buffer()
            self.ser.write(cmd_bytes)
            
            response1 = self.ser.readline().decode('utf-8', errors='ignore').strip()
            self.write_log("INFO", f"Received start response: {response1}")
            
            # ★ MEAS_N (meas_n) の値に基づいて待ち時間を動的に算出
            wait_time = meas_n * m_int // 1000 + 5
            self.progress["maximum"] = wait_time
            
            for i in range(wait_time):
                self.progress["value"] = i + 1
                self.countdown_label.config(text=f"{wait_time - i}s left")
                self.root.update()
                time.sleep(1)
                
            self.countdown_label.config(text="Waiting response...")
            self.root.update()
            
            old_timeout = self.ser.timeout
            self.ser.timeout = 15 # 測定回数が多い場合に備えてタイムアウト長めに保持
            
            response2 = self.ser.readline().decode('utf-8', errors='ignore').strip()
            self.ser.timeout = old_timeout 
            
            self.write_log("INFO", f"Command '{cmd_char}' completed. Resp2 (End String): {response2}")
            success = True
        except Exception as e:
            self.write_log("ERROR", f"Command '{cmd_char}' failed: {str(e)}")
        finally:
            self.progress["value"] = 0
            self.countdown_label.config(text="")
            self.set_gui_state(tk.NORMAL)

        if success:
            self.start_measurement()

    def send_parameters(self):
        if not self.ser or not self.ser.is_open:
            self.write_log("ERROR", "Serial port is not open.")
            return
        try:
            frH = int(self.entries["entry_frH"].get())
            pw1 = int(self.entries["entry_pw1"].get())
            phase_mapping = {"0": 0, "90": 2, "180": 4, "270": 6}
            pp1 = phase_mapping[self.entries["combobox_pp1"].get()]
            p_int = int(self.entries["entry_p_int"].get())
            m_int = int(self.entries["entry_m_int"].get())
            pw2 = int(self.entries["entry_pw2"].get())
            pp2 = phase_mapping[self.entries["combobox_pp2"].get()]
            meas_n = int(self.entries["entry_meas_n"].get()) # ★ MEAS_N 取得
            
            other_vars = [pw1, pp1, pw2, pp2, p_int, m_int, meas_n]
            # ★ 18バイトの構造体用パッキング ('<i7h')
            data_bytes = struct.pack('<i7h', frH, *other_vars)
        except ValueError:
            self.write_log("WARN", "Invalid parameter numeric formats.")
            return

        self.set_gui_state(tk.DISABLED)
        self.root.update()
        try:
            self.ser.reset_input_buffer()
            self.ser.write(b'P')
            time.sleep(0.05)
            response = self.ser.readline().decode('utf-8', errors='ignore').strip()
            
            if "CMD_P_OK" in response:
                self.ser.write(data_bytes)
                time.sleep(0.05)
                final_response = self.ser.readline().decode('utf-8', errors='ignore').strip()
                self.status_label.config(text="Transmission OK", fg="green")
                self.write_log("INFO", f"Params loaded: {final_response}")
            else:
                self.status_label.config(text="Rejected", fg="red")
        except Exception as e:
            self.write_log("ERROR", f"Parameter error: {str(e)}")
        finally:
            self.set_gui_state(tk.NORMAL)

    def read_channel_data_comma_text(self):
        data_1 = [0] * self.D_N
        data_2 = [0] * self.D_N
        
        for count in range(self.D_N):
            line = self.ser.readline().decode('utf-8', errors='ignore').strip()
            if not line:
                continue
            try:
                ch1_str, ch2_str = line.split(',')
                data_1[count] = int(ch1_str)
                data_2[count] = int(ch2_str)
            except ValueError:
                data_1[count] = 0
                data_2[count] = 0
        return data_1, data_2

    def start_measurement(self):
        if not self.ser or not self.ser.is_open:
            return
        self.set_gui_state(tk.DISABLED)
        self.status_label.config(text="Receiving data...", fg="orange")
        self.root.update()
        
        try:
            time.sleep(0.05)
            self.write_log("INFO", "Sending command 'r' for CSV data block...")
            self.ser.write(b'r\r\n')
            
            data_1, data_2 = self.read_channel_data_comma_text()
            
            num_baseline_points = 100
            avg_ch1 = sum(data_1[-num_baseline_points:]) / num_baseline_points
            avg_ch2 = sum(data_2[-num_baseline_points:]) / num_baseline_points
            
            for count in range(self.D_N):
                data_1[count] = int(data_1[count] - avg_ch1)
                data_2[count] = int(data_2[count] - avg_ch2)
                
            if not os.path.exists(self.save_dir):
                os.makedirs(self.save_dir)
            
            now_d = datetime.datetime.now()
            f_name = now_d.strftime('%y%m%d%H%M')
            
            for suffix, dataset in [('_1.txt', data_1), ('_2.txt', data_2)]:
                with open(os.path.join(self.save_dir, f_name + suffix), 'w', encoding='utf-8') as f:
                    f.write('\n'.join(map(str, dataset)) + '\n')
            
            img = self.draw_graph(f_name, data_1, data_2)
            img.save(os.path.join(self.save_dir, f_name + '.png'))
            
            self.status_label.config(text="Connected", fg="green")
            self.write_log("INFO", f"CSV data plotted/saved successfully. Base: {f_name}")
        except Exception as e:
            self.status_label.config(text="Error", fg="red")
            self.write_log("ERROR", f"Data acquisition crashed: {str(e)}")
        finally:
            self.set_gui_state(tk.NORMAL)

if __name__ == "__main__":
    root = tk.Tk()
    app = SerialGuiApp(root)
    root.mainloop()
