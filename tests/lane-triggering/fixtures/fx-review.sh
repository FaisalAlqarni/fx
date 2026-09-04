#!/usr/bin/env bash
# A change worth reviewing: several files, real logic, no git needed.
# `git add` is refused on a main checkout by fx's own guard (DEBT #36), so the
# fixture ships a diff as a file rather than building a repository.
mkdir -p app
cat > changes.diff <<'DIFF'
diff --git a/app/refunds.rb b/app/refunds.rb
--- a/app/refunds.rb
+++ b/app/refunds.rb
@@ -1,9 +1,14 @@
 class Refunds
   def refund(order, amount)
-    return if amount <= 0
+    return if amount.nil?
     order.update(refunded: order.refunded + amount)
+    Payments.refund!(order.id, amount)
   end
+
+  def bulk_refund(orders, amount)
+    orders.each { |o| refund(o, amount) }
+  end
 end
diff --git a/app/orders_controller.rb b/app/orders_controller.rb
--- a/app/orders_controller.rb
+++ b/app/orders_controller.rb
@@ -3,6 +3,9 @@
   def refund
-    Refunds.new.refund(Order.find(params[:id]), params[:amount].to_i)
+    Refunds.new.refund(Order.find(params[:id]), params[:amount].to_f)
+    render json: { ok: true }
   end
DIFF
