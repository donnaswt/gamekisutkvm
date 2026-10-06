'use strict';
/* =====================================================================
   NỘI DUNG GAME (DỮ LIỆU) – "Hành trình kỹ sư vi mạch SGU"
   Muốn thêm dự án / nhiệm vụ / đồ cửa hàng / huy hiệu: chỉ cần thêm vào các danh sách dưới đây.
   Cách thêm chi tiết xem README.md.
   ===================================================================== */

// ---- Hàm tiện ích ngắn cho dữ liệu ----
const L = s => s.replace(/^\n|\n$/g,'').split('\n');          // chuỗi nhiều dòng -> mảng dòng
const Y = t => ({t, ok:true});                                  // lựa chọn ĐÚNG
const N = (t, why) => ({t, ok:false, why});                     // lựa chọn SAI + lý do

// ---- Máy phát hiện chuỗi (dùng cho nhiệm vụ FSM): KMP đơn giản, đúng cho Moore/Mealy, có/không chồng lấn ----
const DET = {
  border(pat){ let k=pat.length-1; while(k>0 && !pat.endsWith(pat.slice(0,k))) k--; return k; },
  // trả về {ns: trạng thái kế, z: đầu ra Mealy tại bước này}. Moore: z tính theo trạng thái (zMoore).
  step(pat,type,overlap,s,c){
    const Ln=pat.length; let eff=s;
    if(type==='moore' && s===Ln && !overlap) eff=0;
    const cand=pat.slice(0,eff)+c;
    if(type==='moore'){ let k=Math.min(Ln,cand.length); while(k>0 && !cand.endsWith(pat.slice(0,k))) k--; return {ns:k,z:0}; }
    if(cand===pat) return {ns: overlap?DET.border(pat):0, z:1};
    let k=Math.min(Ln-1,cand.length); while(k>0 && !cand.endsWith(pat.slice(0,k))) k--; return {ns:k,z:0};
  },
  zMoore(pat,s){ return s===pat.length?1:0; },
  states(pat,type){ return type==='moore'?pat.length+1:pat.length; }
};

/* ---------------- CẤP NGHỀ ---------------- */
const CAREERS = [
  { id:'student', name:'Sinh viên SGU',         allowance:10, energy:3, next:{xp:500,  projects:['tutorial','logic','flipflop']}, desc:'Làm quen phòng lab và nền tảng logic số.' },
  { id:'intern',  name:'Thực tập sinh',          allowance:20, energy:3, next:{xp:1400, projects:['counter','register']},          desc:'Thiết kế mạch tuần tự: bộ đếm và thanh ghi.' },
  { id:'junior',  name:'Kỹ sư mới',              allowance:35, energy:4, next:{xp:2400, projects:['fsm']},                        desc:'Thiết kế máy trạng thái và tự gỡ lỗi RTL.' },
  { id:'senior',  name:'Kỹ sư có kinh nghiệm',   allowance:50, energy:4, next:null,                                             desc:'Đã hoàn thành lộ trình chính. Tiếp tục luyện tập và trang trí lab!' }
];
const SKILLS = [
  { id:'logic',  name:'Logic số' },
  { id:'seq',    name:'Mạch tuần tự' },
  { id:'rtl',    name:'Viết RTL (VHDL)' },
  { id:'debug',  name:'Mô phỏng & gỡ lỗi' },
  { id:'layout', name:'Sơ đồ & layout' }
];
const SKILL_LEVELS = [0, 6, 15, 30, 50];       // điểm kỹ năng tối thiểu cho cấp 1..5
const STATIONS = { whiteboard:'Bảng trắng', pcdesk:'Bàn máy tính', bench:'Khu kiểm tra', layout:'Khu layout' };

/* ---------------- THƯỞNG CHƯƠNG HƯỚNG DẪN (6 nhiệm vụ cũ) ---------------- */
const TUTORIAL_REWARD = {
  perQuest: { xp:20, money:10 },                          // nhiệm vụ 1..5
  skills:   { 1:{logic:1}, 2:{layout:1}, 3:{rtl:2}, 4:{debug:2}, 5:{layout:1,logic:1} },
  handover: { xp:50, money:40 }                           // nhiệm vụ 6
};

/* ---------------- KHO BẢNG CHÂN TRỊ ---------------- */
const TRUTH_T1 = ['A AND B','A OR B','NOT A','A NAND B','A NOR B','A XOR B','NOT (A XOR B)'];
const TRUTH_T2 = ['A AND (NOT B)','(NOT A) OR B','(A AND B) OR (NOT A)','(A OR B) AND (NOT (A AND B))','NOT (A OR (NOT B))'];
const TRUTH_T3 = ['(A AND B) OR C','(A XOR B) XOR C','NOT ((A OR B) AND C)','(A AND B) OR ((NOT A) AND C)','(A AND B) AND (NOT C)','(A OR B) AND (B OR C)'];

/* ---------------- MẪU CODE VHDL (điền chỗ trống) ---------------- */
function dffV(rising, activeHigh, rv){
  const edgeOk = rising?'rising_edge(clk)':'falling_edge(clk)', edgeBad = rising?'falling_edge(clk)':'rising_edge(clk)';
  const rOk = `rst = '${activeHigh?1:0}'`, rBad = `rst = '${activeHigh?0:1}'`;
  return {
    intro:`D flip-flop kích ${rising?'<b>cạnh LÊN</b>':'<b>cạnh XUỐNG</b>'} của clk. Reset <b>đồng bộ</b>, tích cực mức <b>${activeHigh?'CAO (rst = 1)':'THẤP (rst = 0)'}</b>: khi reset thì Q = ${rv}.`,
    lines: L(`
entity dff_rst is
  port ( clk, rst, d : in  std_logic;
         q           : out std_logic );
end entity;

architecture rtl of dff_rst is
begin
  process(clk)
  begin
    if {1} then
      if {2} then
        q <= {3};
      else
        q <= {4};
      end if;
    end if;
  end process;
end architecture;`),
    blanks:{
      1:{label:'điều kiện clock', hint:`Đề yêu cầu ${rising?'cạnh lên':'cạnh xuống'} của clock: dùng hàm ${edgeOk}.`,
         opts:[N(edgeBad,`Đề yêu cầu ${rising?'cạnh lên':'cạnh xuống'}, đây là cạnh ngược lại.`), Y(edgeOk), N("clk = '1'","Đây là kiểm tra MỨC cao (kéo dài nửa chu kỳ), không phải một cạnh."), N("clk'event","clk'event đúng ở cả hai cạnh (mọi thay đổi của clk).")]},
      2:{label:'điều kiện reset', hint:`Reset tích cực mức ${activeHigh?'cao nghĩa là reset khi rst = 1':'thấp nghĩa là reset khi rst = 0'}. Nó nằm TRONG khối cạnh clock nên là reset đồng bộ.`,
         opts:[N(rBad,`Sai mức: đề yêu cầu reset tích cực mức ${activeHigh?'cao':'thấp'}.`), Y(rOk), N("rst'event","rst'event chỉ bắt thay đổi của rst, không kiểm tra mức.")]},
      3:{label:'giá trị khi reset', hint:`Khi reset thì Q = ${rv}.`,
         opts:[Y(`'${rv}'`), N(`'${rv==='0'?1:0}'`,`Đề yêu cầu khi reset Q = ${rv}.`), N('d','Reset không được lấy theo d.'), N('rst','Q nhận giá trị hằng, không nhận tín hiệu rst.')]},
      4:{label:'giá trị khi không reset', hint:'Bình thường flip-flop D chép đầu vào d vào Q ở cạnh clock.',
         opts:[N('not d','Đó là flip-flop đảo, không phải D flip-flop.'), N('q','Giữ nguyên Q: flip-flop sẽ không bao giờ đổi.'), Y('d'), N('rst','Q không chép rst.')]}
    },
    explain:[
      [`if ${edgeOk} then`, `Mọi cập nhật chỉ xảy ra ở ${rising?'cạnh lên':'cạnh xuống'} của clock.`],
      [`if ${rOk} then`, 'Reset được kiểm tra bên TRONG khối cạnh clock nên là reset đồng bộ.'],
      ['q <= d;', 'Không reset thì Q nhận giá trị d ngay trước cạnh clock.']
    ]
  };
}
function counterUpV(){
  return {
    intro:'Bộ đếm 3 bit đếm lên 0 → 7 rồi quay về 0, reset đồng bộ mức cao, chỉ đếm khi <b>en = 1</b>.',
    lines: L(`
architecture rtl of cnt3 is
  signal cnt : unsigned(2 downto 0) := (others => '0');
begin
  process(clk)
  begin
    if rising_edge(clk) then
      if rst = '1' then
        cnt <= {1};
      elsif {2} then
        cnt <= {3};
      end if;
    end if;
  end process;
  q <= std_logic_vector(cnt);
end architecture;`),
    blanks:{
      1:{label:'giá trị khi reset', hint:'Reset đưa bộ đếm về 0.', opts:[N("(others => '1')",'Đó là 7 (111), không phải 0.'), Y("(others => '0')"), N('"00"','Chuỗi "00" chỉ có 2 bit, cnt có 3 bit: sai độ rộng.'), N('cnt + 1','Reset không được đếm tiếp.')]},
      2:{label:'điều kiện đếm', hint:'Đếm khi en bằng 1.', opts:[N("en = '0'",'Ngược: sẽ đếm khi en = 0.'), Y("en = '1'"), N("en'event",'Không kiểm tra mức của en.'), N('rising_edge(en)','Đã ở trong khối cạnh clk; en là mức điều khiển chứ không phải clock.')]},
      3:{label:'giá trị kế tiếp', hint:'Mỗi nhịp tăng thêm 1; 7 + 1 tự quay về 0 vì chỉ có 3 bit.', opts:[N('cnt - 1','Đó là đếm lùi.'), N('cnt + 2','Tăng 2 sẽ bỏ qua giá trị.'), Y('cnt + 1'), N('cnt(1 downto 0) + 1','Chỉ cộng 2 bit thấp, sai độ rộng (2 bit ≠ 3 bit).')]}
    },
    explain:[['signal cnt : unsigned(2 downto 0)','Biến đếm 3 bit không dấu (cần ieee.numeric_std).'],['if rst = \'1\' then','Reset đồng bộ, nằm trong cạnh lên.'],['elsif en = \'1\' then','Chỉ đếm khi cho phép.'],['cnt <= cnt + 1;','Tăng 1; tràn tự quay về 0.']]
  };
}
function counterModV(M){
  return {
    intro:`Bộ đếm <b>modulo-${M}</b> 4 bit: đếm 0 → ${M-1} rồi quay về 0; reset đồng bộ mức cao; chỉ đếm khi en = 1.`,
    lines: L(`
architecture rtl of cntmod is
  signal cnt : unsigned(3 downto 0) := (others => '0');
begin
  process(clk)
  begin
    if rising_edge(clk) then
      if rst = '1' then
        cnt <= (others => '0');
      elsif en = '1' then
        if {1} then
          cnt <= {2};
        else
          cnt <= {3};
        end if;
      end if;
    end if;
  end process;
  q <= std_logic_vector(cnt);
end architecture;`),
    blanks:{
      1:{label:'điều kiện quay về 0', hint:`Giá trị lớn nhất là ${M-1}. Khi đạt giá trị đó thì nhịp sau phải về 0.`,
         opts:[N(`cnt = ${M}`,`Khi cnt = ${M} thì đã đếm tới ${M} (thừa một giá trị).`), Y(`cnt = ${M-1}`), N('cnt = 15','15 là giá trị cực đại của 4 bit: sẽ thành modulo-16.'), N(`cnt = ${M-2}`,`Quay về 0 quá sớm: chỉ đếm tới ${M-2}.`)]},
      2:{label:'giá trị khi quay về', hint:'Quay về 0.', opts:[N('cnt + 1','Phải quay về 0, không tăng tiếp.'), Y("(others => '0')"), N("(others => '1')",'Đó là 15.'), N('cnt - 1','Đó là đếm lùi.')]},
      3:{label:'giá trị bình thường', hint:'Bình thường đếm tăng 1.', opts:[N("(others => '0')",'Sẽ luôn về 0, không đếm.'), N('cnt','Giữ nguyên, không đếm.'), N('cnt - 1','Đếm lùi.'), Y('cnt + 1')]}
    },
    explain:[[`if cnt = ${M-1} then`,`Phát hiện giá trị cuối (${M-1}) để quay về 0: đây là cách làm bộ đếm modulo ${M}.`],['cnt <= cnt + 1;','Các giá trị còn lại tăng 1.']]
  };
}
function counterDownV(){
  return {
    intro:'Bộ đếm <b>lùi</b> 3 bit: reset đồng bộ mức cao đặt cnt = 7 (111); mỗi nhịp giảm 1; 0 trừ 1 quay về 7.',
    lines: L(`
architecture rtl of down3 is
  signal cnt : unsigned(2 downto 0) := (others => '1');
begin
  process(clk)
  begin
    if rising_edge(clk) then
      if rst = '1' then
        cnt <= {1};
      else
        cnt <= {2};
      end if;
    end if;
  end process;
  q <= std_logic_vector(cnt);
end architecture;`),
    blanks:{
      1:{label:'giá trị khi reset', hint:'Đề: reset đặt cnt = 7.', opts:[N("(others => '0')",'Đó là 0; đề yêu cầu 7.'), Y("(others => '1')"), N('"11"','"11" chỉ 2 bit, cnt có 3 bit.'), N('cnt - 1','Reset không giảm tiếp.')]},
      2:{label:'giá trị kế tiếp', hint:'Đếm lùi nghĩa là trừ 1; 0 - 1 tự quay về 7 vì 3 bit.', opts:[N('cnt + 1','Đó là đếm lên.'), Y('cnt - 1'), N('cnt - 2','Giảm 2 sẽ bỏ qua giá trị.'), N("cnt(2 downto 1) - 1",'Sai độ rộng.')]}
    },
    explain:[['cnt <= (others => \'1\');','Reset về 111 = 7.'],['cnt <= cnt - 1;','Trừ 1; 000 - 1 quay vòng về 111 (số học modulo 2^3).']]
  };
}
function shiftV(left){
  const sh = left ? 'sr(2 downto 0) & din' : 'din & sr(3 downto 1)';
  const out = left ? 'sr(3)' : 'sr(0)';
  return {
    intro:`Thanh ghi dịch 4 bit, dịch <b>${left?'trái':'phải'}</b>: mỗi cạnh lên bit mới <b>din</b> đi vào ${left?'bit 0 (LSB)':'bit 3 (MSB)'}; ngõ ra nối tiếp <b>dout</b> là bit ${left?'3 (MSB)':'0 (LSB)'}. Reset đồng bộ mức cao đưa về 0000.`,
    lines: L(`
architecture rtl of shift4 is
  signal sr : std_logic_vector(3 downto 0) := (others => '0');
begin
  process(clk)
  begin
    if rising_edge(clk) then
      if rst = '1' then
        sr <= (others => '0');
      else
        sr <= {1};
      end if;
    end if;
  end process;
  dout <= {2};
end architecture;`),
    blanks:{
      1:{label:'phép dịch', hint: left?'Dịch trái: bỏ bit cao nhất sr(3), giữ sr(2 downto 0) rồi nối din vào cuối (bit 0).':'Dịch phải: din vào đầu (bit 3), giữ sr(3 downto 1).',
         opts: left
          ? [N('sr(3 downto 0) & din','Nối 4 bit + 1 bit = 5 bit, sai độ rộng.'), N('din & sr(3 downto 1)','Đó là dịch PHẢI; đề yêu cầu dịch trái.'), Y(sh), N('sr(3 downto 1) & din','Vẫn 4 bit nhưng chỉ thay bit 0 bằng din, các bit khác không dịch.')]
          : [N('sr(2 downto 0) & din','Đó là dịch TRÁI; đề yêu cầu dịch phải.'), Y(sh), N('din & sr(3 downto 0)','Nối 1 + 4 = 5 bit, sai độ rộng.'), N('din & sr(2 downto 0)','Chỉ thay bit 3 bằng din, các bit khác không dịch.')]},
      2:{label:'ngõ ra nối tiếp', hint: left?'Bit bị đẩy ra khi dịch trái là bit cao nhất.':'Bit bị đẩy ra khi dịch phải là bit thấp nhất.',
         opts:[N(left?'sr(0)':'sr(3)', left?'sr(0) là bit mới vào, không phải bit sắp bị đẩy ra.':'sr(3) là bit mới vào, không phải bit sắp bị đẩy ra.'), Y(out), N('din','din là ngõ vào, không phải ngõ ra.'), N('sr','sr có 4 bit, dout chỉ có 1 bit.')]}
    },
    explain:[['sr <= '+sh+';', left?'Giữ 3 bit thấp rồi nối din: mọi bit nhích lên một vị trí.':'Giữ 3 bit cao rồi đặt din phía trước: mọi bit nhích xuống một vị trí.'],['dout <= '+out+';','Bit đi ra khỏi thanh ghi ở nhịp này.']]
  };
}
function fsmV(pat){
  const Ln=pat.length, nx=[];
  for(let s=0;s<=Ln;s++) nx[s]=[DET.step(pat,'moore',true,s,'0').ns, DET.step(pat,'moore',true,s,'1').ns];
  const names=Array.from({length:Ln+1},(_,i)=>'S'+i);
  const stOpts=ok=>names.map(n=>n===ok?Y(n):N(n,`Chưa đúng: xét chuỗi vừa nhận được, tìm phần cuối dài nhất trùng với phần đầu của mẫu "${pat}".`));
  const row=s=>{
    const a=(s===Ln)?'{3}':`S${nx[s][0]}`, b=(s===Ln)?'{2}':(s===1?'{4}':`S${nx[s][1]}`);
    return `      when S${s} => if x = '1' then next_state <= ${b}; else next_state <= ${a}; end if;`;
  };
  const rows=[]; for(let s=0;s<=Ln;s++) rows.push(row(s));
  const lines = L(`
architecture rtl of det is
  type state_t is (${names.join(', ')});
  signal state, next_state : state_t;
begin
  process(clk)
  begin
    if rising_edge(clk) then
      if rst = '1' then
        state <= {1};
      else
        state <= next_state;
      end if;
    end if;
  end process;

  process(state, x)
  begin
    next_state <= state;
    case state is`).concat(rows, L(`
    end case;
  end process;

  z <= '1' when {5} else '0';
end architecture;`));
  return {
    intro:`Máy trạng thái <b>Moore</b> phát hiện chuỗi <b>${pat}</b> (cho phép chồng lấn): <b>S<sub>k</sub></b> nghĩa là đã khớp k bit đầu của mẫu; z = 1 khi đã khớp đủ ${Ln} bit (S${Ln}).`,
    lines,
    blanks:{
      1:{label:'trạng thái khi reset', hint:'Khi reset chưa nhận được bit nào của mẫu.', opts:stOpts('S0')},
      2:{label:`S${Ln} khi x = 1`, hint:`Đã khớp "${pat}", nhận thêm 1: tìm phần cuối của "${pat}1" trùng với đầu của "${pat}" (dài nhất).`, opts:stOpts('S'+nx[Ln][1])},
      3:{label:`S${Ln} khi x = 0`, hint:`Đã khớp "${pat}", nhận thêm 0: tìm phần cuối của "${pat}0" trùng với đầu của "${pat}" (dài nhất).`, opts:stOpts('S'+nx[Ln][0])},
      4:{label:'S1 khi x = 1', hint:`Mới khớp "${pat[0]}", nhận thêm 1: xét "${pat[0]}1".`, opts:stOpts('S'+nx[1][1])},
      5:{label:'điều kiện đầu ra', hint:`Moore: z chỉ phụ thuộc trạng thái hiện tại; z = 1 khi đã khớp đủ mẫu (S${Ln}).`,
         opts:[N(`state = S${Ln-1}`,`Mới khớp ${Ln-1} bit, chưa đủ mẫu.`), N('state = S0','S0 là chưa khớp bit nào.'), N(`next_state = S${Ln}`,'Sẽ lên 1 sớm hơn một nhịp: Moore dùng trạng thái hiện tại.'), Y(`state = S${Ln}`)]}
    },
    explain:[
      ['type state_t is (...)', `Mỗi trạng thái là một mức khớp mẫu "${pat}".`],
      ['state <= next_state;', 'Thanh ghi trạng thái cập nhật ở cạnh lên, có reset đồng bộ.'],
      ['next_state <= state;', 'Gán mặc định để không sinh latch.'],
      ['case state is ... when Sk => ...', 'Mỗi dòng when là một hàng của bảng chuyển trạng thái.'],
      ['z <= \'1\' when state = S'+Ln+' else \'0\';', 'Đầu ra Moore chỉ phụ thuộc trạng thái.']
    ]
  };
}
const CODE = {
  gates:{ variants:[
    { intro:'<b>Nửa cộng</b> (half adder): <b>s</b> là bit tổng, <b>cout</b> là bit nhớ của a + b (mỗi số 1 bit).',
      lines:L(`
library ieee;
use ieee.std_logic_1164.all;

entity half_adder is
  port ( a, b : in  std_logic;
         s    : out std_logic;
         cout : out std_logic );
end entity;

architecture rtl of half_adder is
begin
  s    <= {1};
  cout <= {2};
end architecture;`),
      blanks:{
        1:{label:'bit tổng s', hint:'Tổng của hai bit bằng 1 khi hai bit khác nhau (0+1, 1+0).', opts:[N('a or b','OR cho 1 cả khi a = b = 1, nhưng 1 + 1 có tổng bằng 0.'), N('a and b','AND là bit nhớ, không phải bit tổng.'), Y('a xor b'), N('a nand b','NAND không cho bit tổng của phép cộng.')]},
        2:{label:'bit nhớ cout', hint:'Chỉ có nhớ khi 1 + 1.', opts:[Y('a and b'), N('a xor b','XOR là bit tổng; số nhớ chỉ bằng 1 khi cả hai bit bằng 1.'), N('a or b','OR bằng 1 cả khi chỉ một bit bằng 1, lúc đó không có nhớ.'), N('not a','Không liên quan đến b.')]}
      },
      explain:[['s <= a xor b;','Tổng: 0+0=0, 0+1=1, 1+0=1, 1+1=0 (nhớ 1) → đúng bảng chân trị XOR.'],['cout <= a and b;','Nhớ: chỉ 1 + 1 mới tạo nhớ → AND.']] },
    { intro:'<b>Bộ chọn kênh 2→1</b> (mux2): <b>sel = 1</b> chọn đầu vào <b>b</b>, ngược lại chọn <b>a</b>.',
      lines:L(`
library ieee;
use ieee.std_logic_1164.all;

entity mux2 is
  port ( a, b, sel : in  std_logic;
         y         : out std_logic );
end entity;

architecture rtl of mux2 is
begin
  y <= {1} when sel = '1' else {2};
end architecture;`),
      blanks:{
        1:{label:'khi sel = 1', hint:'Đề: sel = 1 chọn b.', opts:[N('a','Khi sel = 1 phải chọn b.'), Y('b'), N("'0'",'Mux chuyển đầu vào, không phải hằng 0.'), N('not b','Mux không đảo đầu vào.')]},
        2:{label:'khi sel = 0', hint:'Khi sel = 0 chọn a.', opts:[N('b','Khi sel = 0 phải chọn a.'), N("'1'",'Mux chuyển đầu vào, không phải hằng 1.'), Y('a'), N('not a','Mux không đảo đầu vào.')]}
      },
      explain:[["y <= b when sel = '1' else a;",'Phép gán có điều kiện: mô tả một bộ mux (logic tổ hợp, không cần clock).']] }
  ]},
  decoder:{ variants:[{
    intro:'<b>Bộ giải mã 2→4</b> (dạng one-hot): ngõ ra y có đúng một bit bằng 1 tại vị trí sel.',
    lines:L(`
process(sel)
begin
  case sel is
    when "00" => y <= "0001";
    when "01" => y <= {1};
    when "10" => y <= "0100";
    when others => y <= {2};
  end case;
end process;`),
    blanks:{
      1:{label:'sel = 01', hint:'Bit số 1 bằng 1: 0010.', opts:[N('"0001"','Đó là kết quả của sel = 00.'), Y('"0010"'), N('"0100"','Đó là kết quả của sel = 10.'), N('"1000"','Đó là kết quả của sel = 11.')]},
      2:{label:'trường hợp còn lại', hint:'Với sel = 11 bit số 3 bằng 1: 1000. VHDL cần when others vì sel có thể là các giá trị khác như X, U.', opts:[N('"0000"','Với sel = 11 phải có đúng một bit bằng 1 (one-hot).'), Y('"1000"'), N('"1111"','Không phải one-hot.'), N('"0001"','Đó là của sel = 00.')]}
    },
    explain:[['case sel is','Mỗi when là một hàng của bảng chân trị.'],['when others =>','std_logic có 9 giá trị nên case cần when others để bao phủ mọi trường hợp; ở đây cũng chính là sel = "11".']]
  }]},
  dff:{ variants:[ dffV(true,true,'0'), dffV(true,false,'0'), dffV(false,true,'0'), dffV(true,true,'1') ] },
  counter:{ variants:[ counterUpV(), counterModV(6), counterModV(10), counterModV(12), counterDownV() ] },
  register:{ variants:[ {
    intro:'<b>Thanh ghi 4 bit có nạp</b>: reset đồng bộ mức cao về 0000; khi <b>load = 1</b> nạp d vào thanh ghi; ngược lại giữ nguyên giá trị.',
    lines:L(`
architecture rtl of reg4 is
  signal r : std_logic_vector(3 downto 0) := (others => '0');
begin
  process(clk)
  begin
    if rising_edge(clk) then
      if rst = '1' then
        r <= {1};
      elsif {2} then
        r <= {3};
      end if;
    end if;
  end process;
  q <= r;
end architecture;`),
    blanks:{
      1:{label:'giá trị khi reset', hint:'Reset đưa về 0000.', opts:[N('d','Reset không lấy d.'), N('"1111"','Đề yêu cầu về 0000.'), Y("(others => '0')"), N("(others => 'Z')",'Z là trở kháng cao, không phải mức logic 0.')]},
      2:{label:'điều kiện nạp', hint:'Nạp khi load bằng 1.', opts:[N("load = '0'",'Ngược lại: sẽ nạp khi load = 0.'), Y("load = '1'"), N("load'event",'Không kiểm tra mức.'), N("rst = '0'",'Đây không phải điều kiện nạp.')]},
      3:{label:'giá trị nạp', hint:'Nạp dữ liệu d.', opts:[N('q','q chỉ là ngõ ra, nạp q vào r sẽ giữ nguyên giá trị.'), Y('d'), N('not d','Đảo dữ liệu, không phải nạp.'), N('r','Giữ nguyên giá trị, không nạp được.')]}
    },
    explain:[["elsif load = '1' then","Không reset thì mới xét nạp; không nạp thì r giữ nguyên (không có else)."],['r <= d;','Nạp 4 bit d vào r ở cạnh lên.']]
  }, shiftV(true), shiftV(false) ] },
  fsm:{ variants:[ fsmV('101'), fsmV('11'), fsmV('110') ] }
};

/* ---------------- KỊCH BẢN LỖI (nhiệm vụ sửa lỗi) ----------------
   bug: số thứ tự dòng (bắt đầu từ 0) chứa lỗi; mode:'insert' = thêm dòng mới TRƯỚC dòng bug; mặc định là thay dòng. */
const DEBUG = {
  falling:{ tier:1, title:'Bộ đếm đếm sai thời điểm', symptom:'Đề yêu cầu đếm ở <b>cạnh lên</b> của clock, nhưng trên waveform Q lại đổi ở <b>cạnh xuống</b>.',
    lines:L(`
architecture rtl of cnt3 is
  signal cnt : unsigned(2 downto 0) := (others => '0');
begin
  process(clk)
  begin
    if falling_edge(clk) then
      if rst = '1' then
        cnt <= (others => '0');
      elsif en = '1' then
        cnt <= cnt + 1;
      end if;
    end if;
  end process;
  q <= std_logic_vector(cnt);
end architecture;`), bug:6,
    fixes:[N("if clk = '0' then","Mức 0 không phải một cạnh: mạch sẽ tính liên tục trong cả nửa chu kỳ clock thấp."), Y('if rising_edge(clk) then'), N('if falling_edge(rst) then','Cạnh phải lấy từ clock, không phải từ rst.'), N('if rising_edge(en) then','en là tín hiệu điều khiển, không phải clock.')],
    why:'Đề yêu cầu cạnh lên nên dùng rising_edge(clk). falling_edge làm mạch cập nhật ở cạnh xuống.' },
  assign:{ tier:1, title:'Lỗi biên dịch: phép gán', symptom:'Trình biên dịch báo lỗi tại dòng cập nhật cnt: <i>"cnt là signal, không thể gán bằng :="</i>.',
    lines:L(`
architecture rtl of cnt3 is
  signal cnt : unsigned(2 downto 0) := (others => '0');
begin
  process(clk)
  begin
    if rising_edge(clk) then
      cnt := cnt + 1;
    end if;
  end process;
  q <= std_logic_vector(cnt);
end architecture;`), bug:7,
    fixes:[N('cnt = cnt + 1;','Dấu = là phép so sánh, không phải phép gán.'), N("cnt <= cnt & '1';",'Nối thêm một bit, không phải cộng 1.'), Y('cnt <= cnt + 1;'), N('cnt <= cnt + 1','Thiếu dấu chấm phẩy ở cuối câu lệnh.')],
    why:'Với signal dùng <= ; := chỉ dùng cho variable (và giá trị khởi tạo).' },
  sens:{ tier:1, title:'Clock chạy nhưng Q đứng yên', symptom:'Trong mô phỏng, clock chạy đều nhưng Q luôn bằng 000 dù en = 1.',
    lines:L(`
architecture rtl of cnt3 is
  signal cnt : unsigned(2 downto 0) := (others => '0');
begin
  process(rst)
  begin
    if rising_edge(clk) then
      if rst = '1' then
        cnt <= (others => '0');
      elsif en = '1' then
        cnt <= cnt + 1;
      end if;
    end if;
  end process;
  q <= std_logic_vector(cnt);
end architecture;`), bug:4,
    fixes:[N('process(en)','Process chỉ chạy khi en đổi, không chạy theo clock.'), N('process(cnt)','Process chạy khi cnt đổi: không còn là mạch đồng bộ theo clock.'), Y('process(clk)'), N('process','Không có danh sách nhạy và không có wait: process chạy vô hạn, mô phỏng bị treo.')],
    why:'Process có rising_edge(clk) phải được đánh thức bởi clk, nên danh sách nhạy là process(clk).' },
  rstpol:{ tier:1, title:'Reset sai mức', symptom:'Mạch chỉ đếm khi rst = 1 và đứng yên ở 0 khi rst = 0. Đề: reset đồng bộ <b>tích cực mức cao</b>.',
    lines:L(`
architecture rtl of cnt3 is
  signal cnt : unsigned(2 downto 0) := (others => '0');
begin
  process(clk)
  begin
    if rising_edge(clk) then
      if rst = '0' then
        cnt <= (others => '0');
      else
        cnt <= cnt + 1;
      end if;
    end if;
  end process;
  q <= std_logic_vector(cnt);
end architecture;`), bug:7,
    fixes:[N("if rst = '0' then",'Đây chính là dòng gốc (reset mức thấp).'), N("if rst'event then","rst'event không kiểm tra mức."), Y("if rst = '1' then"), N("if rst = '1' and clk = '1' then",'Dư điều kiện và không cần thiết: đã nằm trong khối cạnh lên.')],
    why:'Reset tích cực mức cao nghĩa là reset khi rst = 1.' },
  width:{ tier:2, title:'Lỗi biên dịch: độ rộng không khớp', symptom:'Biên dịch báo: <i>độ dài của "00" (2) khác độ dài của cnt (3)</i>.',
    lines:L(`
architecture rtl of cnt3 is
  signal cnt : unsigned(2 downto 0) := (others => '0');
begin
  process(clk)
  begin
    if rising_edge(clk) then
      if rst = '1' then
        cnt <= "00";
      else
        cnt <= cnt + 1;
      end if;
    end if;
  end process;
  q <= std_logic_vector(cnt);
end architecture;`), bug:8,
    fixes:[N('cnt <= "0";','Chuỗi 1 bit: vẫn không khớp với cnt 3 bit.'), N('cnt <= 0;','0 là số nguyên, không gán trực tiếp cho unsigned (cần to_unsigned hoặc dùng chuỗi bit).'), Y('cnt <= "000";'), N('cnt <= "0000";','Chuỗi 4 bit: vẫn không khớp với cnt 3 bit.')],
    why:'Hằng chuỗi bit phải có đúng số bit của tín hiệu: cnt 3 bit cần "000".' },
  slv:{ tier:2, title:'Lỗi biên dịch: toán tử +', symptom:'Biên dịch báo: <i>toán tử "+" không được định nghĩa cho std_logic_vector</i>.',
    lines:L(`
library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
...
architecture rtl of cnt3 is
  signal cnt : std_logic_vector(2 downto 0) := "000";
begin
  process(clk)
  begin
    if rising_edge(clk) then
      cnt <= cnt + 1;
    end if;
  end process;
  q <= std_logic_vector(cnt);
end architecture;`), bug:6, lineNotes:{10:'Đây là dòng bị báo lỗi, nhưng nguyên nhân gốc nằm ở kiểu khai báo của cnt.'},
    fixes:[N('signal cnt : integer := 0;','integer có phép + nhưng q <= std_logic_vector(cnt) sẽ lỗi (không đổi trực tiếp integer sang std_logic_vector).'), N('signal cnt : bit_vector(2 downto 0) := "000";','bit_vector cũng không có phép + chuẩn.'), N('signal cnt : std_logic := \'0\';','Chỉ 1 bit, không đếm tới 7 được.'), Y('signal cnt : unsigned(2 downto 0) := "000";')],
    why:'Phép cộng số học cần kiểu số: dùng unsigned (ieee.numeric_std) rồi đổi sang std_logic_vector khi xuất ra cổng.' },
  mod10:{ tier:2, title:'Bộ đếm thập phân đếm quá', symptom:'Bộ đếm modulo-10 phải đếm 0 → 9 rồi về 0, nhưng waveform thấy Q tới 1010 (10) rồi mới về 0.',
    lines:L(`
architecture rtl of bcd is
  signal cnt : unsigned(3 downto 0) := (others => '0');
begin
  process(clk)
  begin
    if rising_edge(clk) then
      if rst = '1' then
        cnt <= (others => '0');
      elsif cnt = 10 then
        cnt <= (others => '0');
      else
        cnt <= cnt + 1;
      end if;
    end if;
  end process;
  q <= std_logic_vector(cnt);
end architecture;`), bug:9,
    fixes:[N('elsif cnt = 11 then','Còn quá hơn nữa: đếm tới 11.'), N('elsif cnt = 15 then','Sẽ thành modulo-16.'), N('elsif cnt = 0 then','Sẽ luôn về 0 ngay, không đếm.'), Y('elsif cnt = 9 then')],
    why:'Giá trị cuối là 9: khi cnt = 9 thì nhịp sau về 0, nên dãy là 0..9 (10 giá trị).' },
  others:{ tier:2, title:'Lỗi biên dịch: case thiếu trường hợp', symptom:'Biên dịch báo: <i>các lựa chọn của case chưa bao phủ hết các giá trị của sel</i>.',
    lines:L(`
process(sel, a, b, c)
begin
  case sel is
    when "00" => y <= a;
    when "01" => y <= b;
    when "10" => y <= c;
  end case;
end process;`), bug:7, mode:'insert',
    fixes:[N('when "11" => y <= \'0\';','Vẫn thiếu: std_logic có 9 giá trị nên chuỗi 2 bit có 81 tổ hợp, không chỉ "11".'), N('when "1" => y <= c;','Độ dài "1" (1 bit) không khớp sel (2 bit).'), Y("when others => y <= '0';"), N('end if;','Không có if để kết thúc.')],
    why:'case phải bao phủ mọi giá trị có thể của sel; when others => ... xử lý các giá trị còn lại.' },
  shiftw:{ tier:2, title:'Thanh ghi dịch lỗi độ rộng', symptom:'Biên dịch báo: <i>độ dài vế phải (5) khác độ dài sr (4)</i>. Mục tiêu: dịch TRÁI, din vào bit 0.',
    lines:L(`
architecture rtl of shift4 is
  signal sr : std_logic_vector(3 downto 0) := (others => '0');
begin
  process(clk)
  begin
    if rising_edge(clk) then
      sr <= sr(3 downto 0) & din;
    end if;
  end process;
  dout <= sr(3);
end architecture;`), bug:7,
    fixes:[N('sr <= sr(3 downto 1) & din;','Vẫn 4 bit nhưng chỉ thay bit 0 bằng din, các bit khác không dịch.'), N('sr <= din & sr(3 downto 1);','Đây là dịch PHẢI; mục tiêu là dịch trái.'), N('sr <= sr + din;','Không phải phép dịch (và std_logic_vector không có +).'), Y('sr <= sr(2 downto 0) & din;')],
    why:'Dịch trái 4 bit: bỏ sr(3), giữ sr(2 downto 0) rồi nối din → đúng 3 + 1 = 4 bit.' },
  latch:{ tier:3, title:'Công cụ tổng hợp báo latch', symptom:'Tổng hợp cảnh báo: <i>suy ra latch (chốt) cho next_state</i> vì có nhánh không gán giá trị.',
    lines:L(`
process(state, x)
begin
  case state is
    when S0 =>
      if x = '1' then next_state <= S1; end if;
    when S1 =>
      if x = '0' then next_state <= S2; end if;
    when S2 =>
      if x = '1' then next_state <= S3; else next_state <= S0; end if;
    when S3 =>
      if x = '1' then next_state <= S1; else next_state <= S2; end if;
  end case;
end process;`), bug:2, mode:'insert',
    fixes:[N('next_state <= S0;','Tránh được latch nhưng sai chức năng: ở S1, x = 1 phải giữ S1 chứ không về S0.'), N('next_state <= S1;','Tránh được latch nhưng sai chức năng với các trạng thái khác.'), N('wait on state;','wait không dùng được cùng danh sách nhạy và không giải quyết latch.'), Y('next_state <= state;')],
    why:'Gán mặc định next_state <= state; ở đầu process để mọi nhánh đều có giá trị (giữ trạng thái), nên không còn latch.' },
  noreset:{ tier:3, title:'FSM không thể reset', symptom:'Mô phỏng: state ban đầu là <b>"U"</b> (không xác định) và nhấn rst không đưa FSM về S0. Đề: reset đồng bộ mức cao về S0.',
    lines:L(`
process(clk)
begin
  if rising_edge(clk) then
    state <= next_state;
  end if;
end process;`), bug:3,
    fixes:[N("if rst = '0' then state <= S0; else state <= next_state; end if;",'Sai mức reset: đề yêu cầu rst = 1.'), N("if rst = '1' then state <= next_state; else state <= S0; end if;",'Ngược: reset lại cho phép chuyển trạng thái, còn bình thường thì luôn về S0.'), N('state <= S0;','Luôn về S0, FSM không bao giờ chạy.'), Y("if rst = '1' then state <= S0; else state <= next_state; end if;")],
    why:'Cần nhánh reset đồng bộ trong khối cạnh lên: rst = 1 thì state <= S0.' }
};
// các nhóm kịch bản dùng cho nhiệm vụ (theo kiến thức đã học)
const DEBUG_GROUPS = { basic:['falling','assign','sens','rstpol'], counter:['width','slv','mod10','falling'], comb:['others'], shift:['shiftw'], fsm:['latch','noreset'] };

/* ---------------- SƠ ĐỒ KHỐI ----------------
   Port: {id,name,kind}. kind = 'clk' | 'rst' | 'en' | 'data' (mặc định). Dây chỉ được nối từ ngõ ra sang ngõ vào cùng loại. */
const P = (id,name,kind) => ({id,name:name===undefined?'':name,kind:kind||'data'});
const DIAGRAMS = {
  counter2:{
    title:'Sơ đồ khối bộ đếm 2 bit',
    intro:'<b>Yêu cầu:</b> clock và reset đi vào bộ đếm 2 bit; Q đi đến khối hiển thị. Có một khối thừa đó!',
    blocks:[
      {id:'clk',label:'CLK',sub:'xung nhịp',color:'#c6e6fb',w:100,h:46,out:[P('out','','clk')],def:[190,40]},
      {id:'rst',label:'RST',sub:'reset mức cao',color:'#ffd3df',w:100,h:46,out:[P('out','','rst')],def:[190,230]},
      {id:'cnt',label:'Bộ đếm 2 bit',sub:'counter2',color:'#bfe8d8',w:150,h:96,in:[P('clk','clk','clk'),P('rst','rst','rst')],out:[P('q','Q[1:0]')],def:[340,110]},
      {id:'disp',label:'Hiển thị Q',sub:'2 đèn LED',color:'#fff0b8',w:100,h:60,in:[P('in','Q')],def:[540,128]},
      {id:'alu',label:'Bộ cộng 8 bit',sub:'(thử xem)',color:'#e9e4f2',w:110,h:46,in:[P('a','a')],out:[P('s','s')],def:[350,270],extra:true}
    ],
    wires:[
      {f:'clk.out',t:'cnt.clk',miss:'Chưa nối <b>CLK → clk</b> của bộ đếm.'},
      {f:'rst.out',t:'cnt.rst',miss:'Chưa nối <b>RST → rst</b> của bộ đếm.'},
      {f:'cnt.q',t:'disp.in',miss:'Chưa nối <b>Q[1:0] của bộ đếm → Hiển thị Q</b>.'}
    ],
    why:{'clk.out>cnt.rst':'Dây từ CLK đang nối vào cổng <b>rst</b>: clock phải vào cổng <b>clk</b>.','rst.out>cnt.clk':'Dây từ RST đang nối vào cổng <b>clk</b>: reset phải vào cổng <b>rst</b>.'},
    okHtml:'<ul class="clean"><li><b>CLK → clk</b>: bộ đếm cần nhịp clock để biết lúc nào cập nhật (ở cạnh lên).</li><li><b>RST → rst</b>: reset đưa bộ đếm về 00.</li><li><b>Q[1:0] → Hiển thị</b>: giá trị đếm 2 bit đi ra khối hiển thị; dây luôn đi một chiều từ ngõ ra sang ngõ vào.</li></ul>'
  },
  halfadder:{
    title:'Sơ đồ khối nửa cộng',
    intro:'<b>Yêu cầu:</b> nửa cộng nhận hai bit A, B; xuất <b>S</b> (tổng) và <b>Cout</b> (số nhớ). Dùng đúng cổng cần thiết, gỡ cổng thừa.',
    blocks:[
      {id:'A',label:'A',sub:'ngõ vào',color:'#c6e6fb',w:80,h:40,out:[P('out')],def:[190,50]},
      {id:'B',label:'B',sub:'ngõ vào',color:'#c6e6fb',w:80,h:40,out:[P('out')],def:[190,210]},
      {id:'xor',label:'XOR',sub:'cổng',color:'#bfe8d8',w:100,h:70,in:[P('a','a'),P('b','b')],out:[P('y','y')],def:[350,50]},
      {id:'and',label:'AND',sub:'cổng',color:'#ffd3df',w:100,h:70,in:[P('a','a'),P('b','b')],out:[P('y','y')],def:[350,190]},
      {id:'S',label:'S',sub:'tổng',color:'#fff0b8',w:90,h:44,in:[P('in')],def:[540,64]},
      {id:'C',label:'Cout',sub:'số nhớ',color:'#fff0b8',w:90,h:44,in:[P('in')],def:[540,204]},
      {id:'or',label:'OR',sub:'(thử xem)',color:'#e9e4f2',w:100,h:70,in:[P('a','a'),P('b','b')],out:[P('y','y')],def:[350,310],extra:true}
    ],
    wires:[
      {f:'A.out',t:'xor.a',miss:'Chưa nối <b>A → XOR.a</b>.'},{f:'B.out',t:'xor.b',miss:'Chưa nối <b>B → XOR.b</b>.'},
      {f:'A.out',t:'and.a',miss:'Chưa nối <b>A → AND.a</b>.'},{f:'B.out',t:'and.b',miss:'Chưa nối <b>B → AND.b</b>.'},
      {f:'xor.y',t:'S.in',miss:'Chưa nối <b>XOR → S</b> (tổng).'},{f:'and.y',t:'C.in',miss:'Chưa nối <b>AND → Cout</b> (số nhớ).'}
    ],
    why:{'xor.y>C.in':'Đầu ra XOR là bit <b>tổng</b>, không phải số nhớ. Số nhớ do AND tạo ra.','and.y>S.in':'Đầu ra AND là <b>số nhớ</b>; bit tổng phải lấy từ XOR.'},
    okHtml:'<ul class="clean"><li>A và B đi vào <b>cả hai</b> cổng (mỗi ngõ ra có thể nối đến nhiều ngõ vào).</li><li><b>S = A XOR B</b>: bằng 1 khi hai bit khác nhau.</li><li><b>Cout = A AND B</b>: chỉ 1 + 1 mới có nhớ. Mỗi ngõ vào chỉ nhận một dây.</li></ul>'
  },
  fulladder:{
    title:'Sơ đồ khối cộng đầy đủ',
    intro:'<b>Yêu cầu:</b> cộng đầy đủ (full adder) A + B + Cin bằng <b>hai nửa cộng</b> và một cổng OR: nửa cộng 1 cộng A, B; nửa cộng 2 cộng kết quả với Cin; Cout = hai số nhớ OR với nhau.',
    blocks:[
      {id:'A',label:'A',color:'#c6e6fb',w:70,h:34,out:[P('out')],def:[180,20]},
      {id:'B',label:'B',color:'#c6e6fb',w:70,h:34,out:[P('out')],def:[180,90]},
      {id:'Cin',label:'Cin',color:'#c6e6fb',w:70,h:34,out:[P('out')],def:[180,260]},
      {id:'ha1',label:'Nửa cộng 1',color:'#bfe8d8',w:110,h:70,in:[P('a','a'),P('b','b')],out:[P('s','s'),P('c','c')],def:[290,40]},
      {id:'ha2',label:'Nửa cộng 2',color:'#bfe8d8',w:110,h:70,in:[P('a','a'),P('b','b')],out:[P('s','s'),P('c','c')],def:[290,200]},
      {id:'or',label:'OR',color:'#ffd3df',w:80,h:60,in:[P('a','a'),P('b','b')],out:[P('y','y')],def:[460,150]},
      {id:'S',label:'S',sub:'tổng',color:'#fff0b8',w:80,h:34,in:[P('in')],def:[560,215]},
      {id:'Cout',label:'Cout',sub:'nhớ ra',color:'#fff0b8',w:80,h:34,in:[P('in')],def:[560,70]},
      {id:'and',label:'AND',sub:'(thử xem)',color:'#e9e4f2',w:90,h:60,in:[P('a','a'),P('b','b')],out:[P('y','y')],def:[290,330],extra:true}
    ],
    wires:[
      {f:'A.out',t:'ha1.a',miss:'Chưa nối <b>A → Nửa cộng 1 (a)</b>.'},{f:'B.out',t:'ha1.b',miss:'Chưa nối <b>B → Nửa cộng 1 (b)</b>.'},
      {f:'ha1.s',t:'ha2.a',miss:'Chưa nối <b>tổng của nửa cộng 1 → nửa cộng 2 (a)</b>.'},{f:'Cin.out',t:'ha2.b',miss:'Chưa nối <b>Cin → nửa cộng 2 (b)</b>.'},
      {f:'ha2.s',t:'S.in',miss:'Chưa nối <b>tổng của nửa cộng 2 → S</b>.'},
      {f:'ha1.c',t:'or.a',miss:'Chưa nối <b>nhớ của nửa cộng 1 → OR (a)</b>.'},{f:'ha2.c',t:'or.b',miss:'Chưa nối <b>nhớ của nửa cộng 2 → OR (b)</b>.'},
      {f:'or.y',t:'Cout.in',miss:'Chưa nối <b>OR → Cout</b>.'}
    ],
    why:{'ha1.c>S.in':'Bit nhớ không đưa vào đầu ra tổng. Tổng cuối cùng lấy từ nửa cộng 2.','ha2.s>Cout.in':'Cout lấy từ OR của hai số nhớ, không lấy từ bit tổng.'},
    okHtml:'<ul class="clean"><li>Nửa cộng 1 tính A + B; nửa cộng 2 cộng tổng đó với Cin → <b>S</b>.</li><li>Hai số nhớ (từ hai nửa cộng) không bao giờ cùng bằng 1, nên chỉ cần <b>OR</b> để có Cout.</li></ul>'
  },
  counterEn:{
    title:'Sơ đồ khối bộ đếm có enable và báo cuối',
    intro:'<b>Yêu cầu:</b> bộ đếm modulo-10 có clock, reset, <b>enable</b>. Q đến khối hiển thị và đến bộ so sánh “= 9”; bộ so sánh bật đèn <b>LED báo cuối</b>.',
    blocks:[
      {id:'clk',label:'CLK',color:'#c6e6fb',w:80,h:34,out:[P('out','','clk')],def:[180,20]},
      {id:'rst',label:'RST',color:'#ffd3df',w:80,h:34,out:[P('out','','rst')],def:[180,90]},
      {id:'en',label:'EN',sub:'cho phép',color:'#d9f2c9',w:80,h:40,out:[P('out','','en')],def:[180,160]},
      {id:'cnt',label:'Bộ đếm mod-10',color:'#bfe8d8',w:140,h:100,in:[P('clk','clk','clk'),P('rst','rst','rst'),P('en','en','en')],out:[P('q','Q[3:0]')],def:[290,60]},
      {id:'cmp',label:'So sánh = 9',color:'#fff0b8',w:110,h:60,in:[P('in','Q')],out:[P('eq','eq')],def:[470,190]},
      {id:'disp',label:'Hiển thị Q',color:'#fff0b8',w:100,h:50,in:[P('in','Q')],def:[500,60]},
      {id:'led',label:'LED cuối',sub:'đếm tới 9',color:'#ffd3df',w:90,h:50,in:[P('in')],def:[600,300]},
      {id:'alu',label:'Bộ cộng 8 bit',sub:'(thử xem)',color:'#e9e4f2',w:110,h:46,in:[P('a','a')],out:[P('s','s')],def:[300,300],extra:true}
    ],
    wires:[
      {f:'clk.out',t:'cnt.clk',miss:'Chưa nối <b>CLK → clk</b>.'},{f:'rst.out',t:'cnt.rst',miss:'Chưa nối <b>RST → rst</b>.'},{f:'en.out',t:'cnt.en',miss:'Chưa nối <b>EN → en</b>.'},
      {f:'cnt.q',t:'disp.in',miss:'Chưa nối <b>Q → Hiển thị</b>.'},{f:'cnt.q',t:'cmp.in',miss:'Chưa nối <b>Q → So sánh = 9</b>.'},{f:'cmp.eq',t:'led.in',miss:'Chưa nối <b>so sánh → LED cuối</b>.'}
    ],
    why:{},
    okHtml:'<ul class="clean"><li>clk, rst, en là ba loại tín hiệu điều khiển khác nhau; mỗi loại vào đúng cổng của nó.</li><li>Q đi đến <b>hai nơi</b> (hiển thị và so sánh): một ngõ ra có thể nối nhiều ngõ vào.</li><li>Bộ so sánh “= 9” cho biết đã đếm tới giá trị cuối của modulo-10.</li></ul>'
  },
  shift4:{
    title:'Sơ đồ khối thanh ghi dịch 4 bit',
    intro:'<b>Yêu cầu:</b> thanh ghi dịch nối tiếp gồm 4 flip-flop: din → FF0 → FF1 → FF2 → FF3 → dout, <b>cùng một clock</b> cho cả 4 flip-flop.',
    blocks:[
      {id:'clk',label:'CLK',color:'#c6e6fb',w:80,h:34,out:[P('out','','clk')],def:[180,20]},
      {id:'din',label:'din',sub:'dữ liệu vào',color:'#d9f2c9',w:90,h:36,out:[P('out')],def:[180,250]},
      {id:'ff0',label:'FF0',sub:'D flip-flop',color:'#bfe8d8',w:76,h:70,in:[P('d','D'),P('clk','','clk')],out:[P('q','Q')],def:[250,110]},
      {id:'ff1',label:'FF1',sub:'D flip-flop',color:'#bfe8d8',w:76,h:70,in:[P('d','D'),P('clk','','clk')],out:[P('q','Q')],def:[350,110]},
      {id:'ff2',label:'FF2',sub:'D flip-flop',color:'#bfe8d8',w:76,h:70,in:[P('d','D'),P('clk','','clk')],out:[P('q','Q')],def:[450,110]},
      {id:'ff3',label:'FF3',sub:'D flip-flop',color:'#bfe8d8',w:76,h:70,in:[P('d','D'),P('clk','','clk')],out:[P('q','Q')],def:[550,110]},
      {id:'dout',label:'dout',sub:'dữ liệu ra',color:'#fff0b8',w:90,h:36,in:[P('in')],def:[560,250]},
      {id:'and',label:'AND',sub:'(thử xem)',color:'#e9e4f2',w:90,h:60,in:[P('a','a'),P('b','b')],out:[P('y','y')],def:[360,320],extra:true}
    ],
    wires:[
      {f:'clk.out',t:'ff0.clk',miss:'Chưa nối CLK vào <b>FF0</b>.'},{f:'clk.out',t:'ff1.clk',miss:'Chưa nối CLK vào <b>FF1</b>.'},{f:'clk.out',t:'ff2.clk',miss:'Chưa nối CLK vào <b>FF2</b>.'},{f:'clk.out',t:'ff3.clk',miss:'Chưa nối CLK vào <b>FF3</b>.'},
      {f:'din.out',t:'ff0.d',miss:'Chưa nối <b>din → D của FF0</b>.'},{f:'ff0.q',t:'ff1.d',miss:'Chưa nối <b>Q của FF0 → D của FF1</b>.'},
      {f:'ff1.q',t:'ff2.d',miss:'Chưa nối <b>Q của FF1 → D của FF2</b>.'},{f:'ff2.q',t:'ff3.d',miss:'Chưa nối <b>Q của FF2 → D của FF3</b>.'},
      {f:'ff3.q',t:'dout.in',miss:'Chưa nối <b>Q của FF3 → dout</b>.'}
    ],
    why:{},
    okHtml:'<ul class="clean"><li>Một clock chung đi vào <b>cả 4</b> flip-flop để chúng cập nhật cùng lúc.</li><li>Q của flip-flop trước nối vào D của flip-flop sau: mỗi nhịp dữ liệu nhích sang flip-flop kế tiếp.</li><li>Bit đi ra ở dout là bit đã đi qua 4 flip-flop (trễ 4 nhịp).</li></ul>'
  }
};

/* ---------------- LAYOUT (mô hình minh họa trên lưới) ----------------
   Khối: w,h tính theo ô; x,y là vị trí bắt đầu (ô). Chân: {id,dir:'in'|'out',row,name}. */
const FFB = [{id:'d',dir:'in',row:0,name:'D'},{id:'q',dir:'out',row:0,name:'Q'}];
const LAYOUTS = {
  counter2:{
    cols:14, rows:8,
    intro:'<b>Layout</b> là cách bố trí và kết nối các phần tử trên chip. Hãy <b>kéo</b> các khối trên lưới sao cho khối nào cũng cách khối khác <b>ít nhất 1 ô trống</b>, rồi <b>nối 5 dây</b>: Q0→NOT, NOT→D bit 0, Q0→XOR.a, Q1→XOR.b, XOR→D bit 1.',
    blocks:[
      {id:'ff0',label:'FF bit 0',sub:'flip-flop',w:3,h:2,x:1,y:2,col:'#c6e6fb',pins:[{id:'d',dir:'in',row:0,name:'D'},{id:'q',dir:'out',row:0,name:'Q0'}]},
      {id:'not',label:'NOT',sub:'',w:2,h:1,x:4,y:2,col:'#ffd3df',pins:[{id:'in',dir:'in',row:0,name:''},{id:'out',dir:'out',row:0,name:''}]},
      {id:'xor',label:'XOR',sub:'',w:2,h:2,x:6,y:3,col:'#fff0b8',pins:[{id:'a',dir:'in',row:0,name:'a'},{id:'b',dir:'in',row:1,name:'b'},{id:'out',dir:'out',row:0,name:''}]},
      {id:'ff1',label:'FF bit 1',sub:'flip-flop',w:3,h:2,x:8,y:3,col:'#bfe8d8',pins:[{id:'d',dir:'in',row:0,name:'D'},{id:'q',dir:'out',row:0,name:'Q1'}]}
    ],
    wires:[['ff0.q','not.in'],['not.out','ff0.d'],['ff0.q','xor.a'],['ff1.q','xor.b'],['xor.out','ff1.d']],
    names:{'ff0.q':'Q0','not.in':'NOT.vào','not.out':'NOT.ra','ff0.d':'D của bit 0','xor.a':'XOR.a','xor.b':'XOR.b','ff1.q':'Q1','xor.out':'XOR.ra','ff1.d':'D của bit 1'},
    hintWrong:'Gợi ý: bit 0 đảo mỗi nhịp (Q0 → NOT → D của bit 0); bit 1 = Q1 XOR Q0.',
    okHtml:'<ul class="clean"><li><b>Layout</b> là cách bố trí và kết nối các phần tử (ở đây: 2 flip-flop, 1 cổng NOT, 1 cổng XOR) trên chip.</li><li>Các khối cách nhau tối thiểu 1 ô trống nên không có khối nào bị tô đỏ; mọi dây đều đi được.</li><li>Mạch: bit 0 đảo mỗi nhịp (D0 = NOT Q0), bit 1 đảo khi Q0 = 1 (D1 = Q1 XOR Q0) → đếm 00 → 01 → 10 → 11 → 00.</li></ul>'
  },
  halfadder:{
    cols:14, rows:8,
    intro:'Bố trí mạch <b>nửa cộng</b>: A, B vào cổng XOR và AND; XOR ra S, AND ra Cout. Các khối cách nhau ≥ 1 ô trống, rồi nối 6 dây.',
    blocks:[
      {id:'a',label:'A',sub:'',w:2,h:1,x:1,y:3,col:'#c6e6fb',pins:[{id:'o',dir:'out',row:0,name:''}]},
      {id:'b',label:'B',sub:'',w:2,h:1,x:3,y:4,col:'#c6e6fb',pins:[{id:'o',dir:'out',row:0,name:''}]},
      {id:'xor',label:'XOR',sub:'',w:2,h:2,x:4,y:3,col:'#bfe8d8',pins:[{id:'a',dir:'in',row:0,name:'a'},{id:'b',dir:'in',row:1,name:'b'},{id:'y',dir:'out',row:0,name:''}]},
      {id:'and',label:'AND',sub:'',w:2,h:2,x:6,y:4,col:'#ffd3df',pins:[{id:'a',dir:'in',row:0,name:'a'},{id:'b',dir:'in',row:1,name:'b'},{id:'y',dir:'out',row:0,name:''}]},
      {id:'s',label:'S',sub:'',w:2,h:1,x:8,y:3,col:'#fff0b8',pins:[{id:'i',dir:'in',row:0,name:''}]},
      {id:'c',label:'Cout',sub:'',w:2,h:1,x:8,y:5,col:'#fff0b8',pins:[{id:'i',dir:'in',row:0,name:''}]}
    ],
    wires:[['a.o','xor.a'],['b.o','xor.b'],['a.o','and.a'],['b.o','and.b'],['xor.y','s.i'],['and.y','c.i']],
    names:{'a.o':'A','b.o':'B','xor.a':'XOR.a','xor.b':'XOR.b','and.a':'AND.a','and.b':'AND.b','xor.y':'XOR.ra','and.y':'AND.ra','s.i':'S','c.i':'Cout'},
    hintWrong:'Gợi ý: S lấy từ XOR, Cout lấy từ AND; A và B đi vào cả hai cổng.',
    okHtml:'<ul class="clean"><li>Mỗi ngõ ra (A, B) nối được đến nhiều ngõ vào; mỗi ngõ vào chỉ nhận một dây.</li><li>Khoảng cách tối thiểu 1 ô giữa các khối chừa chỗ cho đường dây đi qua.</li></ul>'
  },
  shift4:{
    cols:16, rows:8,
    intro:'Bố trí <b>thanh ghi dịch 4 bit</b>: din → FF0 → FF1 → FF2 → FF3 → dout. Dùng cả hai hàng để xếp gọn; mọi khối cách nhau ≥ 1 ô trống, rồi nối 5 dây (đường clock chung được bỏ qua trong mô hình này).',
    blocks:[
      {id:'din',label:'din',sub:'',w:2,h:1,x:1,y:3,col:'#d9f2c9',pins:[{id:'o',dir:'out',row:0,name:''}]},
      {id:'ff0',label:'FF0',sub:'',w:3,h:2,x:3,y:2,col:'#bfe8d8',pins:FFB},
      {id:'ff1',label:'FF1',sub:'',w:3,h:2,x:5,y:3,col:'#bfe8d8',pins:FFB},
      {id:'ff2',label:'FF2',sub:'',w:3,h:2,x:7,y:4,col:'#bfe8d8',pins:FFB},
      {id:'ff3',label:'FF3',sub:'',w:3,h:2,x:9,y:5,col:'#bfe8d8',pins:FFB},
      {id:'dout',label:'dout',sub:'',w:2,h:1,x:12,y:5,col:'#fff0b8',pins:[{id:'i',dir:'in',row:0,name:''}]}
    ],
    wires:[['din.o','ff0.d'],['ff0.q','ff1.d'],['ff1.q','ff2.d'],['ff2.q','ff3.d'],['ff3.q','dout.i']],
    names:{'din.o':'din','ff0.d':'D của FF0','ff0.q':'Q của FF0','ff1.d':'D của FF1','ff1.q':'Q của FF1','ff2.d':'D của FF2','ff2.q':'Q của FF2','ff3.d':'D của FF3','ff3.q':'Q của FF3','dout.i':'dout'},
    hintWrong:'Gợi ý: Q của flip-flop trước nối vào D của flip-flop sau (chuỗi dịch).',
    okHtml:'<ul class="clean"><li>Chuỗi flip-flop được xếp so le để dây đi gọn và vẫn giữ khoảng cách tối thiểu.</li><li>Thứ tự nối quyết định chức năng; vị trí chỉ ảnh hưởng độ dài dây và diện tích (ở mô hình này).</li></ul>'
  }
};

/* ---------------- DỰ ÁN (nhiều bước, lưu tiến độ từng bước) ----------------
   requires: dự án phải xong trước ('tutorial' = chương hướng dẫn). career: cấp nghề tối thiểu (0..3).
   engine: truth | seq | code | debug | fsm | diagram | layout. station: nơi làm việc trong lab. */
const PROJECTS = [
  { id:'logic', name:'Cổng logic cơ bản', icon:'⚙', career:0, requires:['tutorial'], badge:'proj_logic', skill:'logic',
    blurb:'Từ bảng chân trị đến nửa cộng: hiểu AND, OR, NOT, NAND, NOR, XOR rồi mô tả bằng VHDL.',
    done:{xp:40, money:50},
    steps:[
      { id:'s1', title:'Bảng chân trị', engine:'truth', station:'whiteboard', tier:1, params:{pick:2, exprs:TRUTH_T1}, reward:{xp:30,money:20,skill:{logic:2}},
        brief:'Điền đầu ra của các cổng logic cơ bản cho mọi tổ hợp đầu vào.' },
      { id:'s2', title:'Sơ đồ nửa cộng', engine:'diagram', station:'whiteboard', tier:1, params:{defs:['halfadder']}, reward:{xp:35,money:22,skill:{logic:1,layout:1}},
        brief:'Ghép cổng XOR và AND thành nửa cộng.' },
      { id:'s3', title:'Mô tả bằng VHDL', engine:'code', station:'pcdesk', tier:1, params:{templates:['gates']}, reward:{xp:35,money:22,skill:{rtl:2}},
        brief:'Viết phép gán đồng thời cho mạch tổ hợp.' }
    ]},
  { id:'flipflop', name:'Flip-flop và nhịp clock', icon:'⏱', career:0, requires:['logic'], badge:'proj_flipflop', skill:'seq',
    blurb:'D flip-flop, T flip-flop, reset đồng bộ và enable: Q chỉ đổi ở cạnh clock.',
    done:{xp:50, money:60},
    steps:[
      { id:'s1', title:'Dự đoán Q của D flip-flop', engine:'seq', station:'bench', tier:1, params:{variants:[{model:'dff'}]}, reward:{xp:30,money:20,skill:{seq:2}},
        brief:'Cho chuỗi D qua các cạnh lên của clk, tìm Q sau mỗi cạnh.' },
      { id:'s2', title:'Reset đồng bộ và enable', engine:'seq', station:'bench', tier:2, params:{variants:[{model:'dff',rst:true,en:true},{model:'tff',rst:true}]}, reward:{xp:30,money:22,skill:{seq:2}},
        brief:'Thêm reset đồng bộ mức cao và tín hiệu cho phép (hoặc T flip-flop).' },
      { id:'s3', title:'Viết D flip-flop bằng VHDL', engine:'code', station:'pcdesk', tier:2, params:{templates:['dff']}, reward:{xp:30,money:22,skill:{rtl:2}},
        brief:'Điền code D flip-flop với cạnh clock và mức reset theo yêu cầu.' },
      { id:'s4', title:'Sửa lỗi flip-flop', engine:'debug', station:'bench', tier:1, params:{group:'basic'}, reward:{xp:30,money:22,skill:{debug:2}},
        brief:'Tìm dòng gây lỗi và chọn cách sửa.' }
    ]},
  { id:'counter', name:'Bộ đếm', icon:'🔢', career:1, requires:['flipflop'], badge:'proj_counter', skill:'seq',
    blurb:'Bộ đếm có enable, modulo-N, đếm lên/lùi; sơ đồ khối, code và gỡ lỗi.',
    done:{xp:70, money:80},
    steps:[
      { id:'s1', title:'Dự đoán giá trị bộ đếm', engine:'seq', station:'bench', tier:2, params:{variants:[{model:'cnt',bits:3,mod:8,en:true,rst:true},{model:'cnt',bits:3,mod:6,en:true,rst:true}]}, reward:{xp:35,money:25,skill:{seq:2}},
        brief:'Theo dõi bộ đếm có enable và reset (có thể là modulo-6).' },
      { id:'s2', title:'Viết bộ đếm bằng VHDL', engine:'code', station:'pcdesk', tier:2, params:{templates:['counter']}, reward:{xp:35,money:25,skill:{rtl:2}},
        brief:'Bộ đếm lên, modulo-N hoặc đếm lùi.' },
      { id:'s3', title:'Gỡ lỗi bộ đếm', engine:'debug', station:'bench', tier:2, params:{group:'counter'}, reward:{xp:35,money:25,skill:{debug:2}},
        brief:'Một lỗi kinh điển trong code bộ đếm.' },
      { id:'s4', title:'Sơ đồ bộ đếm có enable', engine:'diagram', station:'whiteboard', tier:2, params:{defs:['counterEn']}, reward:{xp:35,money:25,skill:{layout:2}},
        brief:'Phân biệt clk, rst, en và nối đến bộ so sánh.' },
      { id:'s5', title:'Đếm lên/lùi', engine:'seq', station:'bench', tier:3, params:{variants:[{model:'cnt',bits:2,mod:4,en:true,rst:true,updown:true},{model:'cnt',bits:3,mod:8,en:true,rst:true,updown:true}]}, reward:{xp:40,money:30,skill:{seq:3}},
        brief:'Bộ đếm có thêm tín hiệu chọn hướng.' }
    ]},
  { id:'register', name:'Thanh ghi và thanh ghi dịch', icon:'📦', career:1, requires:['counter'], badge:'proj_register', skill:'seq',
    blurb:'Thanh ghi có nạp, thanh ghi dịch nối tiếp; sơ đồ khối và layout.',
    done:{xp:80, money:90},
    steps:[
      { id:'s1', title:'Thanh ghi có nạp', engine:'seq', station:'bench', tier:2, params:{variants:[{model:'reg',bits:4}]}, reward:{xp:40,money:28,skill:{seq:2}},
        brief:'Q chỉ nhận d khi load = 1; reset đồng bộ về 0.' },
      { id:'s2', title:'Thanh ghi dịch', engine:'seq', station:'bench', tier:2, params:{variants:[{model:'shift',bits:4,dir:'left'},{model:'shift',bits:4,dir:'right'}]}, reward:{xp:40,money:28,skill:{seq:2}},
        brief:'Theo dõi dữ liệu nhích qua từng flip-flop.' },
      { id:'s3', title:'Sơ đồ thanh ghi dịch', engine:'diagram', station:'whiteboard', tier:2, params:{defs:['shift4']}, reward:{xp:40,money:28,skill:{layout:2}},
        brief:'Chuỗi 4 flip-flop dùng chung một clock.' },
      { id:'s4', title:'Viết thanh ghi bằng VHDL', engine:'code', station:'pcdesk', tier:3, params:{templates:['register']}, reward:{xp:40,money:30,skill:{rtl:3}},
        brief:'Thanh ghi có nạp hoặc thanh ghi dịch.' },
      { id:'s5', title:'Bố trí thanh ghi dịch', engine:'layout', station:'layout', tier:3, params:{defs:['shift4']}, reward:{xp:40,money:30,skill:{layout:3}},
        brief:'Xếp 4 flip-flop và nối chuỗi dịch trên lưới.' }
    ]},
  { id:'fsm', name:'Máy trạng thái đơn giản', icon:'🔀', career:2, requires:['register'], badge:'proj_fsm', skill:'rtl',
    blurb:'Bộ phát hiện chuỗi bit: bảng chuyển trạng thái, mô phỏng, code VHDL và gỡ lỗi.',
    done:{xp:100, money:120},
    steps:[
      { id:'s1', title:'Bảng chuyển trạng thái', engine:'fsm', station:'whiteboard', tier:2, params:{patterns:['11','10','101'], types:['moore'], overlap:[true]}, reward:{xp:50,money:35,skill:{rtl:2}},
        brief:'Điền trạng thái kế tiếp cho bộ phát hiện chuỗi (Moore).' },
      { id:'s2', title:'Mô phỏng chuỗi vào', engine:'seq', station:'bench', tier:3, params:{variants:[{model:'fsm',pattern:'101',type:'moore',overlap:true},{model:'fsm',pattern:'110',type:'moore',overlap:true}]}, reward:{xp:50,money:35,skill:{seq:3}},
        brief:'Chạy từng bit vào và dự đoán trạng thái, đầu ra.' },
      { id:'s3', title:'Viết FSM bằng VHDL', engine:'code', station:'pcdesk', tier:3, params:{templates:['fsm']}, reward:{xp:50,money:35,skill:{rtl:3}},
        brief:'Hai process: thanh ghi trạng thái và logic trạng thái kế.' },
      { id:'s4', title:'Gỡ lỗi FSM', engine:'debug', station:'bench', tier:3, params:{group:'fsm'}, reward:{xp:50,money:35,skill:{debug:3}},
        brief:'Latch hoặc thiếu reset trong FSM.' },
      { id:'s5', title:'Máy Mealy', engine:'fsm', station:'whiteboard', tier:3, params:{patterns:['11','101','110'], types:['mealy'], overlap:[true,false]}, reward:{xp:55,money:40,skill:{rtl:3,seq:1}},
        brief:'Mealy: đầu ra phụ thuộc cả trạng thái lẫn đầu vào.' }
    ]}
];

/* ---------------- NHIỆM VỤ HẰNG NGÀY (kho mẫu; mỗi ngày bốc 4 cái, tham số/biến thể theo hạt giống) ----------------
   needs: dự án phải xong trước ('tutorial' = xong chương hướng dẫn). minCareer: cấp nghề tối thiểu. */
const DAILY = [
  { id:'d_truth',   title:'Bảng chân trị nhanh',      engine:'truth',   station:'whiteboard', tier:1, needs:'tutorial', minCareer:0, params:{pick:1, exprs:TRUTH_T1.concat(TRUTH_T2)}, reward:{xp:25,money:15,skill:{logic:1}} },
  { id:'d_truth3',  title:'Bảng chân trị 3 đầu vào',  engine:'truth',   station:'whiteboard', tier:2, needs:'logic',    minCareer:0, params:{pick:1, exprs:TRUTH_T3}, reward:{xp:35,money:22,skill:{logic:2}} },
  { id:'d_diag_c2', title:'Sơ đồ bộ đếm 2 bit',        engine:'diagram', station:'whiteboard', tier:1, needs:'tutorial', minCareer:0, params:{defs:['counter2']}, reward:{xp:25,money:15,skill:{layout:1}} },
  { id:'d_lay_c2',  title:'Layout bộ đếm 2 bit',       engine:'layout',  station:'layout',     tier:1, needs:'tutorial', minCareer:0, params:{defs:['counter2']}, reward:{xp:25,money:15,skill:{layout:1}} },
  { id:'d_diag_ha', title:'Sơ đồ cộng',                engine:'diagram', station:'whiteboard', tier:2, needs:'logic',    minCareer:0, params:{defs:['halfadder','fulladder']}, reward:{xp:35,money:22,skill:{logic:1,layout:1}} },
  { id:'d_code_g',  title:'Mạch tổ hợp bằng VHDL',     engine:'code',    station:'pcdesk',     tier:1, needs:'logic',    minCareer:0, params:{templates:['gates','decoder']}, reward:{xp:30,money:18,skill:{rtl:2}} },
  { id:'d_seq_ff',  title:'Dự đoán flip-flop',         engine:'seq',     station:'bench',      tier:1, needs:'flipflop', minCareer:0, params:{variants:[{model:'dff',rst:true},{model:'dff',en:true},{model:'tff',rst:true},{model:'dff',rst:true,en:true}]}, reward:{xp:30,money:18,skill:{seq:2}} },
  { id:'d_code_ff', title:'Flip-flop bằng VHDL',       engine:'code',    station:'pcdesk',     tier:2, needs:'flipflop', minCareer:0, params:{templates:['dff']}, reward:{xp:30,money:20,skill:{rtl:2}} },
  { id:'d_dbg_ff',  title:'Sửa lỗi: flip-flop/clock',  engine:'debug',   station:'bench',      tier:1, needs:'flipflop', minCareer:0, params:{group:'basic'}, reward:{xp:35,money:22,skill:{debug:2}} },
  { id:'d_seq_cnt', title:'Dự đoán bộ đếm',            engine:'seq',     station:'bench',      tier:2, needs:'counter',  minCareer:1, params:{variants:[{model:'cnt',bits:3,mod:8,en:true,rst:true},{model:'cnt',bits:3,mod:6,en:true,rst:true},{model:'cnt',bits:2,mod:4,en:true,rst:true,updown:true},{model:'cnt',bits:4,mod:10,en:true,rst:true}]}, reward:{xp:40,money:25,skill:{seq:2}} },
  { id:'d_code_cnt',title:'Bộ đếm bằng VHDL',          engine:'code',    station:'pcdesk',     tier:2, needs:'counter',  minCareer:1, params:{templates:['counter']}, reward:{xp:40,money:25,skill:{rtl:2}} },
  { id:'d_dbg_cnt', title:'Sửa lỗi: bộ đếm',           engine:'debug',   station:'bench',      tier:2, needs:'counter',  minCareer:1, params:{group:'counter'}, reward:{xp:40,money:25,skill:{debug:2}} },
  { id:'d_diag_en', title:'Sơ đồ bộ đếm + so sánh',    engine:'diagram', station:'whiteboard', tier:2, needs:'counter',  minCareer:1, params:{defs:['counterEn']}, reward:{xp:35,money:22,skill:{layout:2}} },
  { id:'d_dbg_cb',  title:'Sửa lỗi: mạch tổ hợp',      engine:'debug',   station:'bench',      tier:2, needs:'logic',    minCareer:1, params:{group:'comb'}, reward:{xp:35,money:22,skill:{debug:2}} },
  { id:'d_seq_reg', title:'Dự đoán thanh ghi',         engine:'seq',     station:'bench',      tier:2, needs:'register', minCareer:1, params:{variants:[{model:'reg',bits:4},{model:'shift',bits:4,dir:'left'},{model:'shift',bits:4,dir:'right'},{model:'shift',bits:3,dir:'left'}]}, reward:{xp:40,money:25,skill:{seq:2}} },
  { id:'d_code_reg',title:'Thanh ghi bằng VHDL',       engine:'code',    station:'pcdesk',     tier:3, needs:'register', minCareer:1, params:{templates:['register']}, reward:{xp:45,money:28,skill:{rtl:3}} },
  { id:'d_diag_sh', title:'Sơ đồ thanh ghi dịch',      engine:'diagram', station:'whiteboard', tier:2, needs:'register', minCareer:1, params:{defs:['shift4']}, reward:{xp:40,money:25,skill:{layout:2}} },
  { id:'d_lay_ha',  title:'Layout nửa cộng / thanh ghi', engine:'layout', station:'layout',    tier:2, needs:'logic',    minCareer:1, params:{defs:['halfadder','shift4']}, reward:{xp:40,money:25,skill:{layout:2}} },
  { id:'d_dbg_sh',  title:'Sửa lỗi: thanh ghi dịch',   engine:'debug',   station:'bench',      tier:2, needs:'register', minCareer:1, params:{group:'shift'}, reward:{xp:40,money:25,skill:{debug:2}} },
  { id:'d_fsm_tab', title:'Bảng chuyển trạng thái',    engine:'fsm',     station:'whiteboard', tier:3, needs:'fsm',      minCareer:2, params:{patterns:['11','10','01','101','110','011','100'], types:['moore','mealy'], overlap:[true,false]}, reward:{xp:50,money:32,skill:{rtl:2,seq:1}} },
  { id:'d_seq_fsm', title:'Mô phỏng FSM',              engine:'seq',     station:'bench',      tier:3, needs:'fsm',      minCareer:2, params:{variants:[{model:'fsm',pattern:'11',type:'moore',overlap:true},{model:'fsm',pattern:'101',type:'mealy',overlap:true},{model:'fsm',pattern:'10',type:'mealy',overlap:false},{model:'fsm',pattern:'110',type:'moore',overlap:true}]}, reward:{xp:50,money:32,skill:{seq:3}} },
  { id:'d_code_fsm',title:'FSM bằng VHDL',             engine:'code',    station:'pcdesk',     tier:3, needs:'fsm',      minCareer:2, params:{templates:['fsm']}, reward:{xp:50,money:32,skill:{rtl:3}} },
  { id:'d_dbg_fsm', title:'Sửa lỗi: FSM',              engine:'debug',   station:'bench',      tier:3, needs:'fsm',      minCareer:2, params:{group:'fsm'}, reward:{xp:50,money:32,skill:{debug:3}} }
];

/* ---------------- CỬA HÀNG ----------------
   slot: outfit | head | face | neck | chip | wall | floor | decor
   unlock: {career, project, badge, skill:[id,cấp], day, badges:số huy hiệu}. price: số xu. */
const ITEMS = [
  // trang phục (deco: hoodie | stripe | overall | coat | dots | suit)
  {id:'o_hoodie', slot:'outfit', name:'Áo hoodie bạc hà',    price:60,  unlock:{},               color:'#a6e3cc', deco:'hoodie'},
  {id:'o_stripe', slot:'outfit', name:'Áo sọc hải quân',     price:80,  unlock:{day:3},         color:'#f1ecff', deco:'stripe'},
  {id:'o_overall',slot:'outfit', name:'Yếm denim',           price:90,  unlock:{project:'logic'},color:'#8fb4e8', deco:'overall'},
  {id:'o_labcoat',slot:'outfit', name:'Áo blouse lab',       price:130, unlock:{career:1},      color:'#ffffff', deco:'coat'},
  {id:'o_star',   slot:'outfit', name:'Áo ngôi sao',         price:100, unlock:{badge:'daily10'},color:'#ffe08a', deco:'dots'},
  {id:'o_suit',   slot:'outfit', name:'Vest kỹ sư',          price:260, unlock:{career:2},      color:'#5b6b9a', deco:'suit'},
  {id:'o_gold',   slot:'outfit', name:'Blouse vàng danh dự', price:420, unlock:{career:3},      color:'#ffe9a0', deco:'coat'},
  // phụ kiện đầu
  {id:'h_cap',    slot:'head', name:'Mũ lưỡi trai',   price:50,  unlock:{},                 style:'cap',    color:'#ff9eb5'},
  {id:'h_bow',    slot:'head', name:'Nơ tóc',         price:40,  unlock:{},                 style:'bow',    color:'#ff7f9d'},
  {id:'h_beanie', slot:'head', name:'Mũ len',         price:70,  unlock:{day:3},            style:'beanie', color:'#9ad7e8'},
  {id:'h_cat',    slot:'head', name:'Tai mèo',        price:110, unlock:{project:'flipflop'},style:'catears',color:'#4a4458'},
  {id:'h_helmet', slot:'head', name:'Mũ bảo hộ',      price:120, unlock:{project:'counter'}, style:'helmet', color:'#ffd24d'},
  {id:'h_crown',  slot:'head', name:'Vương miện chip',price:320, unlock:{career:3},         style:'crown',  color:'#ffd24d'},
  // phụ kiện mặt
  {id:'f_round',  slot:'face', name:'Kính tròn',  price:45, unlock:{},          style:'round'},
  {id:'f_square', slot:'face', name:'Kính vuông', price:45, unlock:{},          style:'square'},
  {id:'f_shades', slot:'face', name:'Kính râm',   price:90, unlock:{career:1}, style:'shades'},
  // phụ kiện cổ
  {id:'n_scarf',  slot:'neck', name:'Khăn len',        price:55,  unlock:{},             style:'scarf',  color:'#ff9eb5'},
  {id:'n_bowtie', slot:'neck', name:'Nơ cổ',           price:70,  unlock:{day:2},        style:'bowtie', color:'#8f7fd1'},
  {id:'n_medal',  slot:'neck', name:'Huy chương lab',  price:150, unlock:{badge:'tutorial'},style:'medal', color:'#ffd24d'},
  // đồ cho Chip Chip
  {id:'c_bow',    slot:'chip', name:'Nơ cho Chip Chip',    price:40,  unlock:{},                 style:'bow'},
  {id:'c_party',  slot:'chip', name:'Mũ tiệc cho Chip Chip',price:80, unlock:{day:5},            style:'party'},
  {id:'c_shades', slot:'chip', name:'Kính râm cho Chip Chip',price:100,unlock:{project:'register'},style:'shades'},
  // phòng lab: tường
  {id:'wall_lav',  slot:'wall', name:'Tường tím lavender', price:0,  unlock:{},          color:'#cdbff2', dark:'#b3a2e6', icon:'🟪'},
  {id:'wall_mint', slot:'wall', name:'Tường bạc hà',       price:40, unlock:{},          color:'#bfe8d8', dark:'#9bd2bd', icon:'🟩'},
  {id:'wall_peach',slot:'wall', name:'Tường đào',          price:40, unlock:{},          color:'#ffd9c2', dark:'#f0b99b', icon:'🟧'},
  {id:'wall_sky',  slot:'wall', name:'Tường xanh da trời', price:60, unlock:{day:4},     color:'#c6e6fb', dark:'#9fcdea', icon:'🟦'},
  // phòng lab: sàn
  {id:'floor_cream',slot:'floor',name:'Sàn kem',           price:0,  unlock:{},          a:'#fdf6ec', b:'#f8eddc', icon:'⬜'},
  {id:'floor_mint', slot:'floor',name:'Sàn bạc hà',        price:50, unlock:{},          a:'#eefaf4', b:'#dff3e9', icon:'🟩'},
  {id:'floor_pink', slot:'floor',name:'Sàn hồng phấn',     price:50, unlock:{},          a:'#fff0f4', b:'#ffe4ec', icon:'🟥'},
  {id:'floor_wood', slot:'floor',name:'Sàn gỗ sáng',       price:80, unlock:{career:1}, a:'#f6e4c8', b:'#efd8b4', icon:'🟫'},
  // phòng lab: đồ trang trí
  {id:'d_lights', slot:'decor', name:'Dây đèn trang trí', price:70,  unlock:{},                 icon:'✨'},
  {id:'d_plant',  slot:'decor', name:'Chậu cây lớn',      price:60,  unlock:{},                 icon:'🪴'},
  {id:'d_poster', slot:'decor', name:'Áp phích con chip', price:50,  unlock:{},                 icon:'🖼️'},
  {id:'d_lamp',   slot:'decor', name:'Đèn đứng ấm áp',    price:90,  unlock:{project:'logic'},   icon:'💡'},
  {id:'d_rug',    slot:'decor', name:'Thảm ngôi sao',     price:120, unlock:{career:1},         icon:'⭐'},
  {id:'d_cat',    slot:'decor', name:'Mèo ngủ',           price:150, unlock:{skill:['rtl',2]},  icon:'🐱'},
  {id:'d_trophy', slot:'decor', name:'Tủ cúp huy hiệu',   price:200, unlock:{badges:5},         icon:'🏆'}
];

/* ---------------- HUY HIỆU ----------------
   cond: {tutorial} | {project:id} | {career:n} | {stat:'dailyDone'|'debugDone'|'tasksDone', min} | {day:n} | {money:n} | {owned:n} | {skill:[id,cấp]} */
const BADGES = [
  {id:'tutorial',     name:'Kỹ sư vi mạch tập sự SGU', desc:'Hoàn thành chương hướng dẫn.',            cond:{tutorial:true}},
  {id:'proj_logic',   name:'Bậc thầy cổng logic',      desc:'Hoàn thành dự án Cổng logic cơ bản.',      cond:{project:'logic'}},
  {id:'proj_flipflop',name:'Người giữ nhịp',           desc:'Hoàn thành dự án Flip-flop.',              cond:{project:'flipflop'}},
  {id:'proj_counter', name:'Thợ đếm',                  desc:'Hoàn thành dự án Bộ đếm.',                 cond:{project:'counter'}},
  {id:'proj_register',name:'Quản lý thanh ghi',        desc:'Hoàn thành dự án Thanh ghi.',              cond:{project:'register'}},
  {id:'proj_fsm',     name:'Nhà tạo trạng thái',       desc:'Hoàn thành dự án Máy trạng thái.',         cond:{project:'fsm'}},
  {id:'career_1',     name:'Thực tập sinh',            desc:'Lên cấp Thực tập sinh.',                   cond:{career:1}},
  {id:'career_2',     name:'Kỹ sư mới',                desc:'Lên cấp Kỹ sư mới.',                       cond:{career:2}},
  {id:'career_3',     name:'Kỹ sư có kinh nghiệm',     desc:'Lên cấp Kỹ sư có kinh nghiệm.',            cond:{career:3}},
  {id:'daily10',      name:'Chăm chỉ',                 desc:'Hoàn thành 10 nhiệm vụ hằng ngày.',        cond:{stat:'dailyDone',min:10}},
  {id:'daily30',      name:'Bền bỉ',                   desc:'Hoàn thành 30 nhiệm vụ hằng ngày.',        cond:{stat:'dailyDone',min:30}},
  {id:'debug5',       name:'Thám tử lỗi',              desc:'Sửa đúng 5 lỗi code.',                     cond:{stat:'debugDone',min:5}},
  {id:'day7',         name:'Tuần đầu tiên',            desc:'Đến ngày thứ 7 trong game.',               cond:{day:7}},
  {id:'rich',         name:'Tiết kiệm giỏi',           desc:'Cùng lúc có 500 xu.',                      cond:{money:500}},
  {id:'decor5',       name:'Nhà trang trí',            desc:'Sở hữu 6 món trong cửa hàng.',             cond:{owned:6}},
  {id:'rtl3',         name:'Dân RTL',                  desc:'Kỹ năng Viết RTL đạt cấp 3.',              cond:{skill:['rtl',3]}}
];
