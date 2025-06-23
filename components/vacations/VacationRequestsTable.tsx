"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Employee, VacationRequestWithEmployee } from "@/lib/supabase/types"
import { vacationsApi } from "@/lib/supabase/vacations"
import { formatCurrency } from "@/lib/formatters"
import { format, parseISO } from "date-fns"
import { Edit, Trash2 } from "lucide-react"
import VacationRequestDialog from "./VacationRequestDialog"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface VacationRequestsTableProps {
  requests: VacationRequestWithEmployee[]
  employees: Employee[]
  isLoading: boolean
  refreshData: () => void
  showPagination?: boolean
}

export default function VacationRequestsTable({
  requests,
  employees,
  isLoading,
  refreshData,
  showPagination = true,
}: VacationRequestsTableProps) {
  const [editingRequest, setEditingRequest] = useState<VacationRequestWithEmployee | null>(null)
  const [deletingRequest, setDeletingRequest] = useState<VacationRequestWithEmployee | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">В ожидании</Badge>
      case "approved":
        return <Badge variant="default" className="bg-green-500">Одобрено</Badge>
      case "rejected":
        return <Badge variant="destructive">Отклонено</Badge>
      case "completed":
        return <Badge variant="secondary">Завершено</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleDeleteRequest = async () => {
    if (!deletingRequest) return

    try {
      await vacationsApi.deleteRequest(deletingRequest.id)
      refreshData()
    } catch (error) {
      console.error("Error deleting vacation request:", error)
      alert("Ошибка при удалении заявки на отпуск")
    } finally {
      setDeletingRequest(null)
    }
  }

  // Pagination logic
  const totalPages = Math.ceil(requests.length / itemsPerPage)
  const paginatedRequests = showPagination
    ? requests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : requests

  return (
    <div>
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <p>Загрузка данных...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex justify-center items-center h-40">
          <p>Нет заявок на отпуск</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Даты</TableHead>
                  <TableHead>Дней</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.employee?.name || `ID: ${request.employee_id}`}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(request.start_date), "dd.MM.yyyy")} - {format(parseISO(request.end_date), "dd.MM.yyyy")}
                    </TableCell>
                    <TableCell>{request.days_count}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {request.payment_amount ? formatCurrency(request.payment_amount) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingRequest(request)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingRequest(request)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {showPagination && totalPages > 1 && (
            <div className="flex justify-center mt-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Предыдущая
              </Button>
              <span className="flex items-center px-2">
                Страница {currentPage} из {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Следующая
              </Button>
            </div>
          )}
        </>
      )}

      {editingRequest && (
        <VacationRequestDialog
          open={!!editingRequest}
          onClose={() => setEditingRequest(null)}
          onSave={refreshData}
          employees={employees}
          vacationRequest={editingRequest}
        />
      )}

      <AlertDialog open={!!deletingRequest} onOpenChange={() => setDeletingRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заявку на отпуск?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Заявка на отпуск будет удалена из системы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
