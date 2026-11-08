// quotes.js — Kho cau quote ngan cho the hero man hinh Hom Nay.
// Chon cau theo ngay trong nam (1 cau/ngay); bam vao the de xem cau tiep theo.
export const QUOTES = [
  { text: 'Đừng đếm ngày. Hãy làm cho mỗi ngày đều đáng đếm.', author: 'Muhammad Ali' },
  { text: 'Đầu tư vào tri thức luôn mang lại lợi nhuận cao nhất.', author: 'Benjamin Franklin' },
  { text: 'Người chiến thắng không bao giờ bỏ cuộc, kẻ bỏ cuộc không bao giờ chiến thắng.', author: 'Vince Lombardi' },
  { text: 'Thành công là tổng của những nỗ lực nhỏ, lặp lại mỗi ngày.', author: 'Robert Collier' },
  { text: 'Bạn không cần phải giỏi để bắt đầu, nhưng phải bắt đầu để trở nên giỏi.', author: 'Zig Ziglar' },
  { text: 'Khách hàng không mua sản phẩm, họ mua sự an tâm.', author: '' },
  { text: 'Mỗi cuộc gọi hôm nay là một hợp đồng của ngày mai.', author: '' },
  { text: 'Kỷ luật là cầu nối giữa mục tiêu và thành tựu.', author: 'Jim Rohn' },
  { text: 'Đừng chờ cơ hội. Hãy tạo ra cơ hội.', author: 'George Bernard Shaw' },
  { text: 'Việc khó nhất là bắt đầu. Phần còn lại chỉ là kiên trì.', author: 'Amelia Earhart' },
  { text: 'Chất lượng công việc hôm nay quyết định thu nhập ngày mai.', author: '' },
  { text: 'Người bán hàng giỏi nhất là người lắng nghe giỏi nhất.', author: '' },
  { text: 'Mục tiêu không có kế hoạch chỉ là một điều ước.', author: 'Antoine de Saint-Exupéry' },
  { text: 'Hãy làm việc chăm chỉ trong im lặng, để thành công lên tiếng.', author: 'Frank Ocean' },
  { text: 'Không có con đường tắt đến nơi đáng đến.', author: 'Beverly Sills' },
  { text: 'Hôm nay bạn gieo một cuộc hẹn, ngày mai bạn gặt một hợp đồng.', author: '' },
  { text: 'Sự kiên trì biến điều không thể thành có thể.', author: '' },
  { text: 'Đừng so sánh mình với người khác. Hãy so với chính mình hôm qua.', author: '' },
  { text: 'Thành công không đến từ những gì bạn làm thỉnh thoảng, mà từ những gì bạn làm đều đặn.', author: '' },
  { text: 'Muốn đi nhanh hãy đi một mình, muốn đi xa hãy đi cùng đội.', author: 'Tục ngữ châu Phi' },
  { text: 'Một đội mạnh không phải vì không có vấn đề, mà vì cùng nhau giải quyết vấn đề.', author: '' },
  { text: 'Tin vào khách hàng trước, khách hàng sẽ tin vào bạn.', author: '' },
  { text: 'Mỗi hồ sơ pending được xử lý hôm nay là một gia đình được bảo vệ sớm hơn.', author: '' },
  { text: 'Đừng sợ chậm, chỉ sợ đứng yên.', author: 'Tục ngữ' },
  { text: 'Hành động nhỏ mỗi ngày thắng kế hoạch lớn không bao giờ làm.', author: '' },
  { text: 'Bạn thua chỉ khi bạn dừng lại.', author: '' },
  { text: 'Niềm tin là sản phẩm đầu tiên bạn bán mỗi ngày.', author: '' },
  { text: 'Hãy bắt đầu ngày mới bằng việc khó nhất — phần còn lại sẽ nhẹ nhàng.', author: 'Mark Twain' },
  { text: 'Không áp lực, không kim cương.', author: 'Thomas Carlyle' },
  { text: 'Cơ hội thường ngụy trang dưới hình dạng công việc khó khăn.', author: 'Thomas Edison' },
  { text: 'Giỏi hơn 1% mỗi ngày, sau một năm bạn đã khác rất xa.', author: '' },
  { text: 'Khách hàng hài lòng là chiến lược quảng cáo tốt nhất.', author: '' },
  { text: 'Đặt mục tiêu cao và đừng dừng lại cho đến khi chạm tới nó.', author: 'Bo Jackson' },
  { text: 'Làm đúng việc nhỏ mỗi ngày còn hơn hứa việc lớn mỗi tháng.', author: '' },
  { text: 'Sự chuẩn bị tốt là một nửa của thành công.', author: 'Miguel de Cervantes' },
  { text: 'Ngày hôm nay là cơ hội để làm tốt hơn ngày hôm qua.', author: '' },
  { text: 'Đội nào giúp nhau về đích, đội đó không bao giờ thua.', author: '' },
  { text: 'Bảo vệ khách hàng hôm nay là xây tương lai cho chính mình.', author: '' },
]

/** Chi so cau quote cua ngay: day-of-year mod do dai kho. */
export function quoteIndexForDate(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 0)
  const doy = Math.floor((d - start) / 86400000)
  return ((doy % QUOTES.length) + QUOTES.length) % QUOTES.length
}
