# ĐỒ ÁN: SPECRESEARCH LOOP

## Hệ thống hoàn thiện ý tưởng nghiên cứu bằng bằng chứng và vòng lặp xác nhận

Sinh viên xây dựng một website giúp người dùng chuyển một ý tưởng nghiên cứu còn mơ hồ thành một research specification rõ ràng và có kiểm chứng. Hệ thống diễn giải lại ý tưởng, phân rã problem--gap--contribution--claim--evidence, nghiên cứu các công trình liên quan, đề xuất các lựa chọn có giải thích và ví dụ để người dùng xác nhận, sau đó xây dựng kế hoạch thí nghiệm phù hợp với tài nguyên. Bản spec được đánh giá lại bởi nhiều Judge độc lập nhằm phát hiện gap yếu, claim quá rộng, citation không phù hợp hoặc thí nghiệm chưa đủ. Người dùng quyết định sửa đổi trước khi xác nhận phiên bản cuối. Sinh viên được khuyến khích sáng tạo ở từng bước nhưng phải chứng minh hiệu quả bằng dữ liệu, verifier hoặc so sánh với baseline.

## 1. Ý nghĩa của đồ án

Một ý tưởng nghiên cứu ban đầu thường còn nhiều điểm chưa rõ:

-   Vấn đề nghiên cứu cụ thể là gì?
-   Các nghiên cứu trước đã giải quyết đến đâu?
-   Research gap có thật sự tồn tại không?
-   Contribution mới nằm ở đâu?
-   Claim nào cần được chứng minh?
-   Thí nghiệm nào đủ để kiểm chứng claim?
-   Kế hoạch có khả thi với tài nguyên hiện có không?

Nếu đặc tả ban đầu không rõ, AI hoặc nhóm nghiên cứu có thể triển khai sai hướng, đưa ra contribution quá rộng hoặc thiết kế thí nghiệm không đủ sức thuyết phục.

Sinh viên xây dựng một website giúp người dùng chuyển:

    Ý tưởng còn mơ hồ
    → Research spec rõ ràng
    → Có nguồn minh chứng
    → Có kế hoạch thí nghiệm
    → Có phản biện độc lập
    → Được người dùng xác nhận

Hệ thống không bảo đảm paper được chấp nhận tại AAAI, NeurIPS hoặc ICML. Hệ thống chỉ giúp đánh giá mức độ sẵn sàng của ý tưởng theo các tiêu chí như originality, significance, soundness, clarity và reproducibility.

## 2. Mục tiêu

Website phải giúp người dùng:

1.  Diễn giải lại ý tưởng nghiên cứu bằng ngôn ngữ dễ hiểu.
2.  Tách ý tưởng thành problem, research question, gap, contribution, claim và evidence.
3.  Nghiên cứu các công trình liên quan từ nguồn đáng tin cậy.
4.  Phát hiện nội dung còn thiếu, mơ hồ hoặc chưa có bằng chứng.
5.  Đưa ra các lựa chọn kèm giải thích và ví dụ.
6.  Cho phép người dùng chọn, chỉnh sửa hoặc nhập phương án `Other`.
7.  Xây dựng kế hoạch thí nghiệm từng bước.
8.  Kiểm tra khả năng thực hiện với tài nguyên như RTX 3090.
9.  Đưa bản spec qua một số Judge độc lập.
10. Để người dùng quyết định sửa đổi và xác nhận bản cuối.

## 3. Ví dụ đầu vào

Người dùng nhập:

> Tôi muốn xây dựng phương pháp tự động tối ưu prompt nhiều vòng để giảm hallucination khi LLM trích xuất thông tin từ paper.

Hệ thống không viết ngay toàn bộ research proposal.

Nó phải lần lượt làm rõ:

    Hallucination được định nghĩa như thế nào?
    Tác vụ trích xuất những thông tin gì?
    Prompt được tối ưu bằng phương pháp nào?
    So sánh với baseline nào?
    Contribution chính là thuật toán hay verifier?
    Dữ liệu và metric nào được sử dụng?

## 4. Quy trình thực hiện

### Bước 1 --- Diễn giải lại ý tưởng

#### Hệ thống làm gì?

Viết lại ý tưởng bằng ngôn ngữ đơn giản để kiểm tra xem hệ thống có hiểu đúng người dùng không.

#### Ví dụ

> Hệ thống sẽ tạo nhiều phiên bản prompt, chạy chúng trên cùng một tập paper, phát hiện lỗi và tiếp tục sửa prompt. Mục tiêu là giảm những thông tin do LLM tạo ra nhưng không được paper nguồn hỗ trợ.

Sau đó hỏi:

> Tôi đang hiểu đúng ý tưởng của bạn không?

Người dùng có thể:

-   Xác nhận.
-   Chỉnh sửa.
-   Yêu cầu ví dụ khác.
-   Nhập cách hiểu riêng.

#### Khuyến khích sáng tạo

Sinh viên có thể trực quan hóa ý tưởng thành:

-   Sơ đồ.
-   Concept map.
-   Danh sách thành phần.
-   Animation mô tả luồng nghiên cứu.

### Bước 2 --- Phân rã ý tưởng

Hệ thống tách ý tưởng thành các thẻ nhỏ.

| Thành phần | Ví dụ |
| --- | --- |
| Problem | Prompt thủ công có thể không ổn định |
| Research question | Tối ưu nhiều vòng có giảm unsupported claims không? |
| Gap candidate | Các phương pháp hiện tại chưa tối ưu trực tiếp ở mức claim–evidence |
| Contribution | Framework tối ưu prompt dựa trên evidence feedback |
| Claim | Phương pháp giảm unsupported claim |
| Evidence | Kết quả thực nghiệm trên held-out data |
| Constraint | Chạy được trên RTX 3090 |
| Open question | Tối ưu một prompt hay cả pipeline? |

Mỗi thẻ có trạng thái:

    CONFIRMED
    PROPOSED
    MISSING
    AMBIGUOUS
    UNSUPPORTED
    CONFLICT

#### Khuyến khích sáng tạo

Sinh viên có thể:

-   Biểu diễn các thẻ thành graph.
-   Cho phép kéo thả để liên kết claim với evidence.
-   Dùng màu để thể hiện trạng thái.
-   Tự đề xuất thêm loại thẻ phù hợp với từng domain.

### Bước 3 --- Nghiên cứu công trình liên quan

#### Hệ thống làm gì?

Tạo từ khóa tìm kiếm, thu thập các tài liệu liên quan và lập bảng đối sánh.

#### Ví dụ

| Nghiên cứu | Đã làm gì? | Feedback sử dụng | Điểm cần nghiên cứu thêm |
| --- | --- | --- | --- |
| OPRO | LLM đề xuất prompt mới từ prompt và điểm cũ | Điểm tổng | Chưa phân tích lỗi theo từng claim |
| PromptBreeder | Tiến hóa prompt và mutation prompt | Fitness | Có thể tốn nhiều lần gọi model |
| TextGrad | Dùng phản hồi dạng văn bản | LLM feedback | Judge có thể bị bias |
| DSPy | Tối ưu nhiều module trong pipeline | Downstream metric | Cần định nghĩa metric rõ |

Mỗi nhận định phải liên kết với nguồn cụ thể.

#### Khuyến khích sáng tạo

Sinh viên có thể phát triển:

-   Citation graph.
-   Timeline nghiên cứu.
-   Similarity map giữa các paper.
-   Cơ chế chấm độ tin cậy của nguồn.
-   Cảnh báo khi nguồn quá cũ hoặc không trực tiếp hỗ trợ claim.

### Bước 4 --- Đề xuất research gap

Research gap không được tạo theo cách:

> Tôi chưa thấy paper giống hệt nên đây là gap.

Hệ thống phải làm rõ:

    Nghiên cứu trước đã làm được gì?
    Điểm nào vẫn còn hạn chế?
    Vì sao hạn chế đó quan trọng?
    Có thể kiểm nghiệm bằng thí nghiệm nào?

#### Ví dụ gap candidate

> Các phương pháp tối ưu prompt hiện tại có thể sử dụng điểm tổng hoặc textual feedback. Chưa rõ việc tách output thành từng claim, kiểm tra evidence độc lập và dùng lỗi claim-level làm feedback có giúp giảm unsupported claims trong cùng ngân sách inference hay không.

Người dùng được chọn:

#### A. Tập trung vào thuật toán tối ưu prompt

Điểm mới nằm ở mutation, selection hoặc search.

#### B. Tập trung vào claim--evidence verifier

Điểm mới nằm ở cách kiểm tra hallucination.

#### C. Tập trung vào human-in-the-loop

Điểm mới nằm ở cách người dùng xác nhận và điều chỉnh quá trình.

#### D. Kết hợp các hướng

Chọn một contribution chính và các contribution phụ.

#### E. Other

Người dùng nhập hướng riêng.

#### Khuyến khích sáng tạo

Sinh viên được phép phát triển cách tìm gap mới, nhưng phải chứng minh gap bằng tài liệu, không chỉ dựa vào đánh giá chủ quan của LLM.

### Bước 5 --- Xây dựng contribution và claim

#### Ví dụ contribution rõ ràng

1.  Một framework tối ưu prompt qua nhiều vòng bằng claim-level evidence feedback.
2.  Một verifier phân biệt claim có evidence, thiếu evidence và mâu thuẫn với evidence.
3.  Một thực nghiệm so sánh scalar feedback, textual feedback và claim-level feedback.
4.  Một cấu hình có thể chạy với ngân sách GPU hoặc API giới hạn.

#### Claim--Evidence Card

    Claim:
    Phương pháp giảm unsupported claims.

    Baseline:
    Human prompt, self-refine, OPRO-style optimizer.

    Metric:
    Unsupported claim rate.

    Evidence:
    Kết quả trên validation và hidden test.

    Điều kiện bác bỏ:
    Không cải thiện ổn định hoặc làm giảm coverage đáng kể.

#### Khuyến khích sáng tạo

Sinh viên có thể đề xuất:

-   Contribution về phương pháp.
-   Contribution về evaluator.
-   Dataset hoặc benchmark mới.
-   Visualization mới.
-   Insight mới từ quá trình tối ưu.

Mỗi contribution phải có cách kiểm chứng.

### Bước 6 --- Thiết kế thí nghiệm

Hệ thống tạo kế hoạch thí nghiệm theo từng bước.

#### Ví dụ

##### Thí nghiệm 1 --- So sánh baseline

    Human-written prompt
    Self-refine
    Random mutation
    OPRO-style optimization
    Phương pháp đề xuất

Các phương pháp phải dùng cùng:

-   Model.
-   Dataset.
-   Token budget.
-   Số lần gọi LLM.
-   Điều kiện chạy.

##### Thí nghiệm 2 --- Đánh giá chất lượng

Metric có thể gồm:

-   Claim precision và recall.
-   Evidence support rate.
-   Unsupported claim rate.
-   Contradiction rate.
-   Token cost.
-   Latency.
-   JSON validity.

##### Thí nghiệm 3 --- Ablation

Lần lượt bỏ:

-   Claim decomposition.
-   Evidence verifier.
-   Textual feedback.
-   Candidate diversity.
-   User confirmation.

##### Thí nghiệm 4 --- Generalization

Kiểm tra prompt cuối trên:

-   Tập dữ liệu chưa dùng trong quá trình tối ưu.
-   Loại paper khác.
-   Domain khác.
-   Model khác nếu có đủ ngân sách.

#### Khuyến khích sáng tạo

Sinh viên có thể bổ sung:

-   Error analysis trực quan.
-   Pareto frontier giữa chất lượng và chi phí.
-   Cơ chế dừng sớm.
-   Behavioral clustering.
-   Active selection để chọn candidate đáng thử nhất.

### Bước 7 --- Kiểm tra tính khả thi

Hệ thống phải ước lượng:

-   Model sử dụng.
-   VRAM.
-   Số candidate.
-   Số vòng lặp.
-   Số mẫu đánh giá.
-   Token hoặc API cost.
-   Thời gian thực nghiệm.

#### Ví dụ cấu hình

    Model: 7B–8B, 4-bit
    Seed prompts: 5
    Candidates mỗi vòng: 10
    Số vòng: 10
    Development set: 50 mẫu
    Validation set: 300 mẫu
    Top candidates đánh giá đầy đủ: 5

Hệ thống có thể đề xuất giảm quy mô nếu vượt tài nguyên RTX 3090.

#### Khuyến khích sáng tạo

Sinh viên được phép xây:

-   GPU estimator.
-   Cost simulator.
-   Cơ chế evaluation cascade.
-   Dashboard theo dõi thời gian và chi phí thực tế.

### Bước 8 --- Tạo bản research spec

Bản spec tạm thời gồm:

1.  Problem statement.
2.  Research questions.
3.  Related-work matrix.
4.  Research gap.
5.  Proposed approach.
6.  Expected contributions.
7.  Claim--evidence matrix.
8.  Experimental protocol.
9.  Baselines và metrics.
10. Ablation plan.
11. Compute budget.
12. Risks và limitations.
13. Open issues.
14. Decision history.

### Bước 9 --- Đánh giá bằng các Judge độc lập

Sau khi có spec, hệ thống sử dụng một số Judge độc lập.

#### Judge 1 --- Research Gap Judge

Kiểm tra gap có thật sự được tài liệu hỗ trợ không.

#### Judge 2 --- Contribution Judge

Kiểm tra contribution có mới, rõ và bị phóng đại hay không.

#### Judge 3 --- Experiment Judge

Kiểm tra thí nghiệm có đủ để chứng minh claim không.

#### Judge 4 --- Evidence Judge

Kiểm tra citation có thực sự hỗ trợ nội dung đi kèm không.

#### Judge 5 --- Conference Readiness Judge

Đánh giá originality, significance, soundness, clarity và reproducibility.

Các Judge có thể sử dụng:

-   Những LLM khác nhau.
-   Cùng một LLM nhưng context và prompt độc lập.
-   Rule-based verifier kết hợp LLM Judge.

Các Judge phải đánh giá riêng trước khi xem nhận xét của nhau.

#### Ví dụ nhận xét

    Vấn đề:
    Claim về khả năng tổng quát đang quá rộng.

    Lý do:
    Thí nghiệm chỉ sử dụng paper khoa học.

    Mức độ:
    MAJOR.

    Đề xuất:
    Thu hẹp claim hoặc bổ sung thêm domain.

### Bước 10 --- Người dùng quyết định sửa đổi

Hệ thống tổng hợp ý kiến Judge và đưa ra lựa chọn.

#### Ví dụ

> Claim hiện tại nói phương pháp hoạt động trên nhiều domain, nhưng thí nghiệm chỉ có một domain. Bạn muốn xử lý như thế nào?

#### A. Thu hẹp claim

Chỉ khẳng định kết quả trên paper khoa học.

#### B. Mở rộng thí nghiệm

Bổ sung thêm domain tài chính hoặc bất động sản.

#### C. Chuyển thành research question

Không khẳng định khả năng tổng quát trước khi có bằng chứng.

#### D. Other

Người dùng nhập hướng riêng.

Sau khi người dùng chọn:

    Sửa spec
    → Hiển thị phần thay đổi
    → Chạy lại verifier liên quan
    → Judge kiểm tra lại
    → Người dùng xác nhận bản cuối

## 5. Chức năng bắt buộc

Website cần có:

1.  Nhập ý tưởng nghiên cứu.
2.  Diễn giải lại ý tưởng.
3.  Phân rã problem, gap, claim, contribution và evidence.
4.  Tìm kiếm và quản lý nguồn.
5.  Tạo bảng related work.
6.  Phát hiện ambiguity và conflict.
7.  Tạo lựa chọn có giải thích, ví dụ và `Other`.
8.  Lưu quyết định người dùng.
9.  Sinh kế hoạch thí nghiệm.
10. Ước lượng tài nguyên.
11. Tạo research spec.
12. Chạy nhiều Judge độc lập.
13. Tổng hợp điểm đồng thuận và bất đồng.
14. Cho người dùng quyết định sửa đổi.
15. Quản lý version và hiển thị diff.
16. Xuất bản spec cuối cùng.

## 6. Sản phẩm bàn giao

Sinh viên cần nộp:

-   Website chạy được.
-   Source code.
-   Tài liệu kiến trúc.
-   Dataset hoặc tập use case thử nghiệm.
-   Prompt của Generator và các Judge.
-   Cơ chế kiểm tra citation hoặc evidence.
-   Ít nhất hai baseline.
-   Báo cáo đánh giá hệ thống.
-   Video demo.
-   Một research spec hoàn chỉnh do hệ thống tạo ra.

Sinh viên được đánh giá cao khi đề xuất được một cơ chế mới và chứng minh nó giúp:

-   Giảm claim không có bằng chứng.
-   Phát hiện gap tốt hơn.
-   Giảm số câu hỏi không cần thiết.
-   Giảm bias của Judge.
-   Tạo experiment plan đầy đủ hơn.
-   Giảm thời gian hoặc chi phí hoàn thiện spec.

## 8. Tinh thần sáng tạo

Sinh viên không bắt buộc tất cả phải xây cùng một hệ thống giống nhau.

Có thể sáng tạo ở các hướng:

-   Cách phân rã spec.
-   Cách tìm và đánh giá nguồn.
-   Cách phát hiện research gap.
-   Cách tạo lựa chọn cho người dùng.
-   Cách đo disagreement giữa các Judge.
-   Cách trực quan hóa claim--evidence.
-   Cách tối ưu số câu hỏi cần xác nhận.
-   Cách ước lượng tài nguyên thí nghiệm.
-   Cách chống citation sai.
-   Cách phát hiện claim bị phóng đại.

Tuy nhiên, mọi cải tiến phải trả lời được:

> Cải tiến này giải quyết vấn đề gì, được kiểm nghiệm như thế nào và kết quả có tốt hơn baseline hay không?
