# Hành trình kỹ sư vi mạch SGU

Game nhập vai 2D chạy trên trình duyệt (HTML + CSS + JavaScript thuần, không cần cài gì, không cần máy chủ).
Phòng lab trong game là bối cảnh hư cấu, không dùng logo chính thức.

## Chạy game
Bấm đúp `index.html` (Chrome / Edge / Safari). Muốn gửi cho bạn bè: đưa **cả thư mục này** lên Netlify Drop
(https://app.netlify.com/drop) hoặc GitHub Pages rồi gửi link.

## Cách chơi
- Đi: `W A S D` hoặc mũi tên. Tương tác: `E` (hoặc nút ở dưới màn hình). `Q` mở Nhiệm vụ, `P` mở Hồ sơ, `Esc` đóng bảng / mở Menu.
- **Chương 1 (hướng dẫn)**: 6 nhiệm vụ đầu (gặp cô → sơ đồ khối → VHDL → mô phỏng → layout → bàn giao).
- **Sau đó**: mỗi ngày có ⚡ năng lượng (3–4). Mở *Nhiệm vụ* → *Nhận việc* → đi tới đúng khu trong lab (mũi tên nhảy nhảy chỉ đường) → nhấn `E`. Mỗi nhiệm vụ tốn 1 năng lượng.
- Nhiệm vụ cho **XP, xu 🪙, điểm kỹ năng**. Đủ XP và xong các dự án yêu cầu thì tự lên cấp:
  Sinh viên SGU → Thực tập sinh → Kỹ sư mới → Kỹ sư có kinh nghiệm.
- **🌅 Sang ngày mới** do bạn chủ động bấm (nhận trợ cấp, hồi năng lượng, đổi bảng nhiệm vụ). Ngày không tự trôi khi tắt game.
- 5 dự án nhiều bước, lưu tiến độ từng bước: Cổng logic → Flip-flop → Bộ đếm → Thanh ghi → Máy trạng thái.
- *Luyện tập* (tab trong Nhiệm vụ): không tốn năng lượng, 5 lượt có thưởng nhỏ mỗi ngày; sau khi xong hết nội dung chính vẫn chơi mãi.
- *Cửa hàng*: mua trang phục, phụ kiện, đồ cho Chip Chip, trang trí phòng lab; mỗi món ghi rõ điều kiện mở khóa.
- *Hồ sơ*: cấp, XP, kỹ năng, huy hiệu, dự án đã xong.

## Lưu trữ
- Tự lưu vào `localStorage` (khóa `sgu-journey-v2`) sau mỗi thay đổi. Tiến độ game cũ (`sgu-chip-lab-v1`) được tự chuyển đổi khi bấm *Tiếp tục*.
- Menu → *Lưu trữ*: **xuất** (sao chép / tải file `.json`) và **nhập** bản lưu để sao lưu hoặc chuyển máy.

## Cấu trúc file
| File | Nội dung |
|---|---|
| `index.html` | Giao diện + CSS (đổi màu giao diện ở khối `:root`). |
| `js/content.js` | **TOÀN BỘ DỮ LIỆU**: cấp nghề, dự án, nhiệm vụ hằng ngày, đồ cửa hàng, huy hiệu, mẫu code, kịch bản lỗi, sơ đồ, layout. |
| `js/base.js` | Cấu hình (`CONFIG`: tên, nhân vật, độ khó), lời thoại (`TEXT`), màu canvas (`PAL`), lưu trữ, vẽ nhân vật & phòng lab. |
| `js/engines.js` | Các **loại nhiệm vụ** (bảng chân trị, dự đoán mạch tuần tự, điền code, sửa lỗi, bảng FSM, sơ đồ khối, layout). |
| `js/tutorial.js` | Chương 1 (6 nhiệm vụ) và mô hình mô phỏng waveform. |
| `js/host.js` | Hội thoại, khung nhiệm vụ, bảng (panel). |
| `js/game.js` | Logic ngày, thưởng, lên cấp, cửa hàng, hồ sơ, xuất/nhập, vòng lặp. |

## Thêm nội dung (chỉ sửa `js/content.js`)

### Thêm một dự án
Thêm vào mảng `PROJECTS`. Mỗi bước dùng một `engine` + `params`:
```js
{ id:'adder', name:'Bộ cộng', icon:'➕', career:1, requires:['logic'], badge:'proj_adder', skill:'logic',
  blurb:'Cộng nhị phân bằng cổng logic.', done:{xp:60, money:70},
  steps:[
    { id:'s1', title:'Bảng chân trị', engine:'truth', station:'whiteboard', tier:2,
      params:{pick:1, exprs:['(A XOR B) XOR C']}, reward:{xp:35,money:25,skill:{logic:2}}, brief:'...' },
    { id:'s2', title:'Sơ đồ cộng đầy đủ', engine:'diagram', station:'whiteboard', tier:3,
      params:{defs:['fulladder']}, reward:{xp:40,money:28,skill:{layout:2}} }
  ]}
```
- `career`: cấp tối thiểu (0..3). `requires`: dự án phải xong trước (`'tutorial'` = chương 1).
- `station`: `whiteboard` | `pcdesk` | `bench` | `layout`.
- Muốn cấp nghề yêu cầu dự án này, thêm id vào `CAREERS[i].next.projects`.
- Huy hiệu `badge` phải có trong `BADGES` (cond: `{project:'adder'}`).

### Thêm nhiệm vụ hằng ngày
Thêm vào `DAILY` (mỗi ngày game bốc 4 nhiệm vụ, tham số/biến thể đổi theo hạt giống):
```js
{ id:'d_my', title:'Tên nhiệm vụ', engine:'seq', station:'bench', tier:2, needs:'flipflop', minCareer:0,
  params:{variants:[{model:'dff',rst:true},{model:'tff',rst:true}]}, reward:{xp:30,money:18,skill:{seq:2}} }
```

### Thêm biến thể / loại nội dung cho từng engine
| Engine | Thêm ở đâu |
|---|---|
| `truth` | thêm biểu thức vào `TRUTH_T1/T2/T3` (viết đủ ngoặc, toán tử `AND OR NOT NAND NOR XOR XNOR`). |
| `code` | thêm biến thể vào `CODE.<nhóm>.variants`; chỗ trống `{1}`, `{2}`…; mỗi chỗ có **đúng 1** lựa chọn `Y(...)` và các `N(..., 'lý do sai')`. |
| `debug` | thêm kịch bản vào `DEBUG` (đặt `bug` = số dòng, `fixes` có đúng 1 `Y`), rồi thêm id vào `DEBUG_GROUPS`. |
| `diagram` | thêm sơ đồ vào `DIAGRAMS` (khối, cổng, `wires`, khối thừa `extra:true`). |
| `layout` | thêm bố cục vào `LAYOUTS` (khối + chân + `wires`); chú ý vị trí ban đầu phải đang vi phạm. |
| `seq` | thêm mô hình vào `SEQ` trong `engines.js` (hàm `step` thuần), rồi dùng `model:'tên'` trong `params`. |
| `fsm` | đổi `patterns`, `types` (`moore`/`mealy`), `overlap` trong `params`. |

### Thêm đồ cửa hàng, huy hiệu, cấp nghề
- `ITEMS`: `{id, slot, name, price, unlock:{career, project, badge, skill:[id,cấp], day, badges}, ...}`.
  Slot: `outfit | head | face | neck | chip | wall | floor | decor`. Kiểu vẽ có sẵn: xem `deco`/`style` trong các món hiện có.
- `BADGES`: `{id, name, desc, cond:{project|career|stat|day|money|owned|skill|tutorial}}`.
- `CAREERS`: `name`, `allowance` (xu/ngày), `energy`, `next:{xp, projects:[...]}`.

### Thêm loại nhiệm vụ mới
Viết `function makeXxx(params, rng){ return { build(body, host){...}, hint(){...} } }` trong `engines.js`
(gọi `host.wrong(html)` khi sai, `host.success(html)` khi đúng), rồi đăng ký `ENGINES.xxx = (p, rng) => makeXxx(p, rng)`.

## Chỗ chỉnh nhanh khác
- Tên nhân vật/ngoại hình/độ khó: `CONFIG` trong `js/base.js`. Lời thoại: `TEXT` trong `js/base.js`.
- Âm lượng hiệu ứng: `Sound.master`; nhạc nền: `Music.vol`, nhịp độ `Music.bpm`, hợp âm `Music.PROG`, nốt giai điệu `Music.SCALE` (đều trong `js/base.js`).
- Nhạc nền tự tạo bằng WebAudio (không cần file), bắt đầu sau lần bấm đầu tiên; Menu có nút **Nhạc nền** và **Hiệu ứng âm thanh** bật/tắt riêng, game nhớ lựa chọn.
- Thưởng chương hướng dẫn: `TUTORIAL_REWARD` trong `js/content.js`.

Lưu ý nội dung: phần mô phỏng và layout là **mô hình giáo dục trong game**, không phải phần mềm mô phỏng HDL hay layout đủ điều kiện chế tạo.
